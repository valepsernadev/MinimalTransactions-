IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Members')
BEGIN
  CREATE TABLE dbo.Members (
    Id   INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(20) NOT NULL,
    CONSTRAINT UQ_Members_Name UNIQUE (Name)
  );
END

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Expenses')
BEGIN
  CREATE TABLE dbo.Expenses (
    Id          INT IDENTITY(1,1) PRIMARY KEY,
    Description NVARCHAR(60) NOT NULL,
    Amount      INT NOT NULL CONSTRAINT CK_Expenses_Amount CHECK (Amount BETWEEN 1 AND 999999999),
    PayerId     INT NOT NULL CONSTRAINT FK_Expenses_Payer REFERENCES dbo.Members(Id),
    CreatedAt   DATETIME2 NOT NULL CONSTRAINT DF_Expenses_CreatedAt DEFAULT SYSUTCDATETIME()
  );
END

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ExpenseParticipants')
BEGIN
  CREATE TABLE dbo.ExpenseParticipants (
    ExpenseId INT NOT NULL REFERENCES dbo.Expenses(Id) ON DELETE CASCADE,
    MemberId  INT NOT NULL REFERENCES dbo.Members(Id),
    CONSTRAINT PK_ExpenseParticipants PRIMARY KEY (ExpenseId, MemberId)
  );
END
