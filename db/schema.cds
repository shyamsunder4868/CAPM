namespace Company.EmployeeManagement;
entity EmployeeSchema {
    key ID             : UUID;
        Name           : String(50);
        EmpEmail       : String(50);
        Age            : Integer;
        CompanyAddress : String(100);
        MobileNumber   : String(15);
        Salary         : Decimal(12, 2);
        Number         : String(30);
        RAm : String(20);
}
entity StudentSchema {
    key ID     : UUID;
        Name   : String(50);
        Email  : String(50);
        age    : Integer;
        Mobile : Integer;
        Shyam : String(40);
        Ram2:String(20);
        Ram:String(20);
}

entity EmployeeAddress {

    key ID         : UUID;
        EmployeeID : UUID;
        Address    : String(100);
        City       : String(50);
        Pincode    : String(10);
}


