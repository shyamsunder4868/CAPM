using { Company.EmployeeManagement as db } from '../db/schema';

service EmployeeManagementService {

    entity Employees as projection on db.Employees;

    entity EmployeeAddresses as projection on db.EmployeeAddresses;

    entity Students as projection on db.Students;

}