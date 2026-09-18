using { Company.EmployeeManagement as db }
from '../db/schema';

service EmployeeService {

    entity EntityServiceEmployee as projection on db.EmployeeSchema;

    entity EmployeeAddress as projection on db.EmployeeAddress;
}

service StudentService {

    entity ServiceStudent as projection on db.StudentSchema;

}


