export interface IamStatement {
  Sid?: string;
  Effect?: "Allow" | "Deny";    
  Action?: string | string[];
  NotAction?: string | string[];
  Resource?: string | string[];
  NotResource?: string | string[];
  Condition?: {
    StringEquals?: any;
    StringNotEquals?: any;
    StringEqualsIgnoreCase?: any;
    StringNotEqualsIgnoreCase?: any;
    StringLike?: any;
    StringNotLike?: any;
    NumericEquals?: any;
    NumericNotEquals?: any;
    NumericLessThan?: any;
    NumericLessThanEquals?: any;
    NumericGreaterThan?: any;
    NumericGreaterThanEquals?: any;
    DateEquals?: any;
    DateNotEquals?: any;
    DateLessThan?: any;
    DateLessThanEquals?: any;
    DateGreaterThan?: any;
    DateGreaterThanEquals?: any;
    Bool?: any;
    BinaryEquals?: any;
    IpAddress?: any;
    NotIpAddress?: any;
    ArnEquals?: any;
    ArnNotEquals?: any;
    ArnLike?: any;
    ArnNotLike?: any;
    Null?: any;      
  };    
}

export interface IamPolicyDocument {
  Version: "2012-10-17";
  /**
   * Unofficial field to add info about the policy
   */
  Description?: string; 
  Statement?: IamStatement[];  
}
