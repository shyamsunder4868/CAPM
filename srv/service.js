// import cds from '@sap/cds';

// export default cds.service.impl(function () {

//     // BEFORE
//     this.before('CREATE', 'EntityServiceEmployee', (req) => {
//         console.log('1. BEFORE event');

//         // Automatically convert name to uppercase
//         if (req.data.Name) {
//             req.data.Name = req.data.Name.toUpperCase();
//         }
//     });
//     // ON
//     this.on('CREATE', 'EntityServiceEmployee', async (req) => {

//         console.log('2. ON event');

//         const tx = cds.tx(req);

//         const employee = await tx.run(
//             INSERT.into('Company.EmployeeManagement.EmployeeSchema')
//                 .entries(req.data)
//         );

//         return employee;

//     });


//     // AFTER
//     this.after('CREATE', 'EntityServiceEmployee', (data) => {

//         console.log('3. AFTER event');

//         console.log('Created employee:', data.Name);

//     });
// });



import cds from '@sap/cds';

export default cds.service.impl(async function () {

    const { Employees, Departments, Accounts, Transactions } = this.entities;

    // ==================================================
    // 1. EMPLOYEE MANAGEMENT - VALIDATION RULES
    // ==================================================

    // Rule 9: Employee status can only move through valid business states
    const allowedStatusChange = {
        'Active'    : ['Active', 'OnLeave', 'Terminated'],
        'OnLeave'   : ['OnLeave', 'Active', 'Terminated'],
        'Terminated': []   // no further change allowed once terminated
    };

    // ---------- CREATE Employee ----------
    this.before('CREATE', Employees, async (req) => {
        const data = req.data;

        // Rule 3: Email always stored in lowercase
        if (data.Email) {
            data.Email = data.Email.toLowerCase();
        }

        // Rule 4: Salary cannot be zero or negative
        if (data.Salary === undefined || data.Salary <= 0) {
            return req.error(400, 'Salary must be greater than zero.');
        }

        // Rule 5: Joining date cannot be in the future
        if (data.JoiningDate && new Date(data.JoiningDate) > new Date()) {
            return req.error(400, 'Joining date cannot be in the future.');
        }

        // Rule 6: Department must exist before employee is created
        if (!data.Department_ID) {
            return req.error(400, 'Department is required.');
        }
        const dept = await SELECT.one.from(Departments).where({ ID: data.Department_ID });
        if (!dept) {
            return req.error(400, 'Department does not exist.');
        }

        // Rule 1: Employee ID must be unique
        const existingId = await SELECT.one.from(Employees).where({ EmployeeID: data.EmployeeID });
        if (existingId) {
            return req.error(400, 'Employee ID already exists.');
        }

        // Rule 2: Email must be unique
        const existingEmail = await SELECT.one.from(Employees).where({ Email: data.Email });
        if (existingEmail) {
            return req.error(400, 'Email already exists.');
        }

        // New employees always start as Active
        data.Status = 'Active';
    });

    // ---------- UPDATE Employee ----------
    this.before('UPDATE', Employees, async (req) => {
        const data = req.data;

        const current = await SELECT.one.from(Employees).where({ ID: data.ID });
        if (!current) {
            return req.error(404, 'Employee not found.');
        }

        // Rule 7: A terminated employee cannot be updated at all
        if (current.Status === 'Terminated') {
            return req.error(400, 'Terminated employee cannot be updated.');
        }

        // Rule 8: Salary cannot be modified once employee is terminated
        // (extra explicit check, even though rule 7 already blocks it)
        if (data.Salary !== undefined && current.Status === 'Terminated') {
            return req.error(400, 'Salary cannot be modified for a terminated employee.');
        }

        // Rule 4: Salary cannot be zero or negative
        if (data.Salary !== undefined && data.Salary <= 0) {
            return req.error(400, 'Salary must be greater than zero.');
        }

        // Rule 3 + Rule 2: Email lowercase and unique
        if (data.Email) {
            data.Email = data.Email.toLowerCase();
            const existingEmail = await SELECT.one.from(Employees)
                .where({ Email: data.Email, ID: { '!=': current.ID } });
            if (existingEmail) {
                return req.error(400, 'Email already exists.');
            }
        }

        // Rule 1: Employee ID must stay unique if it is changed
        if (data.EmployeeID && data.EmployeeID !== current.EmployeeID) {
            const existingId = await SELECT.one.from(Employees)
                .where({ EmployeeID: data.EmployeeID, ID: { '!=': current.ID } });
            if (existingId) {
                return req.error(400, 'Employee ID already exists.');
            }
        }

        // Rule 6: Department must exist if it is changed
        if (data.Department_ID) {
            const dept = await SELECT.one.from(Departments).where({ ID: data.Department_ID });
            if (!dept) {
                return req.error(400, 'Department does not exist.');
            }
        }

        // Rule 9: Status can only move through valid business states
        if (data.Status && data.Status !== current.Status) {
            const allowedNext = allowedStatusChange[current.Status] || [];
            if (!allowedNext.includes(data.Status)) {
                return req.error(400, `Cannot change status from ${current.Status} to ${data.Status}.`);
            }
        }
    });

    // ==================================================
    // 2. BANK ACCOUNT TRANSFER
    // ==================================================

    this.on('transferMoney', async (req) => {
        const { fromAccountID, toAccountID, amount, referenceID } = req.data;

        // Rule 3: Source and target accounts cannot be the same
        if (fromAccountID === toAccountID) {
            return req.error(400, 'Source and target accounts cannot be the same.');
        }

        // Rule 5: Transfer amount must be greater than zero
        if (!amount || amount <= 0) {
            return req.error(400, 'Transfer amount must be greater than zero.');
        }

        // Rule 11: A transfer request must not be processed twice
        const existingTxn = await SELECT.one.from(Transactions).where({ ReferenceID: referenceID });
        if (existingTxn) {
            return req.error(400, 'This transfer has already been processed.');
        }

        // Rule 1: Source account must exist
        const sourceAccount = await SELECT.one.from(Accounts).where({ ID: fromAccountID });
        if (!sourceAccount) {
            return req.error(404, 'Source account does not exist.');
        }

        // Rule 2: Target account must exist
        const targetAccount = await SELECT.one.from(Accounts).where({ ID: toAccountID });
        if (!targetAccount) {
            return req.error(404, 'Target account does not exist.');
        }

        // Rule 4: Both accounts must be active
        if (sourceAccount.Status !== 'Active' || targetAccount.Status !== 'Active') {
            return req.error(400, 'Both accounts must be active.');
        }

        // Rule 6: Source account must have sufficient balance
        if (sourceAccount.Balance < amount) {
            return req.error(400, 'Insufficient balance in source account.');
        }

        // Rule 9: Update both account balances
        await UPDATE(Accounts, fromAccountID).with({ Balance: sourceAccount.Balance - amount });
        await UPDATE(Accounts, toAccountID).with({ Balance: targetAccount.Balance + amount });

        // Rule 7: Record the debit transaction
        await INSERT.into(Transactions).entries({
            ID: cds.utils.uuid(),
            Account_ID: fromAccountID,
            TransactionType: 'DEBIT',
            Amount: amount,
            ReferenceID: referenceID
        });

        // Rule 8: Record the credit transaction
        await INSERT.into(Transactions).entries({
            ID: cds.utils.uuid(),
            Account_ID: toAccountID,
            TransactionType: 'CREDIT',
            Amount: amount,
            ReferenceID: referenceID
        });

        // Rule 10: If any step above throws an error, CAP automatically
        // rolls back everything already done in this request - nothing gets saved.
        return `Transfer of ${amount} completed successfully from account ${fromAccountID} to ${toAccountID}.`;
    });
});