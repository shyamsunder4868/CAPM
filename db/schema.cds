namespace Company.EmployeeManagement;
entity Employees {
    key EmployeeUUID    : UUID;

        EmployeeCode    : String(20);
        GivenName       : String(50);
        FamilyName      : String(50);
        WorkEmail       : String(100);
        EmployeeAge     : Integer;
        ContactPhone    : String(15);
        AnnualSalary    : Decimal(12,2);
        PositionTitle   : String(80);
        DepartmentName  : String(80);
        HomeAddress     : Association to one EmployeeAddresses
                            on HomeAddress.EmployeeRef = $self;
}
entity EmployeeAddresses {
    key AddressUUID     : UUID;

        StreetAddress   : String(100);
        ApartmentInfo   : String(100);
        Municipality    : String(50);
        Province        : String(50);
        ZipCode         : String(10);
        NationName      : String(50);
        EmployeeRef     : Association to one Employees;
}
entity Students {
    key StudentUUID     : UUID;
        AdmissionNumber : String(20);
        StudentGivenName : String(50);
        StudentFamilyName: String(50);
        AcademicEmail    : String(100);
        StudentAge      : Integer;
        ParentContact   : String(15);
}
