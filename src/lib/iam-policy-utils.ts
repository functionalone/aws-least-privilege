import { IamStatement } from "./aws-segments/iam-policy";
import { SUPPORTED_SERVICES } from "./aws-segments/index";
import { startsWithAny, removeAccountIdFromArn } from "./aws-segments/utils";
import * as AWS from 'aws-sdk';
import * as _ from 'lodash';
import { logger } from './logger';

export type PolicyActionMap = Map<string, Set<string>>;

const ACTIONS_PREFIX = SUPPORTED_SERVICES.map((v) => v.toLowerCase()).concat(['*']);
const RESOURCES_PREFIX = SUPPORTED_SERVICES.map((v) => 'arn:aws:' + v.toLowerCase()).concat(['*']);

export class IamPolicyUtils {

  iam: AWS.IAM;

  constructor() {
    this.iam = new AWS.IAM();
  }

  createPolicyActionMap(policy: IamStatement[]): PolicyActionMap {  
    const mapped = new Map();    
    for (const s of policy) {
      if(s.Effect !== 'Allow') { //only allow supported for now
        continue;
      }
      let actions: string[], resources: string[];
      if(!Array.isArray(s.Action)) {
        actions = [s.Action!];
      }
      else {
        actions = s.Action;
      }
      if(!Array.isArray(s.Resource)) {
        resources = [s.Resource!];
      }
      else {
        resources = s.Resource;
      }
      for (const action of actions) {
        if(startsWithAny(action, ACTIONS_PREFIX)) {
          let resSet = mapped.get(action);
          if(!resSet) {
            resSet = new Set();
            mapped.set(action, resSet);
          } 
          for (const r of resources) {
            if(startsWithAny(r, RESOURCES_PREFIX)) {
              resSet.add(r);
            }
          }
        }
      }    
    }
    return mapped;
  }

  /**
   * Try to unite statements according to resource for the ones where an action has a single resource. 
   * So a resource will appear only once with all relevant statements.
   * @param statements iam statements
   */
  uniteStatments(statements: IamStatement[]): IamStatement[] {
    const resourceToActions: Map<string, string[]> = new Map();
    const res: IamStatement[] = [];
    for (const s of statements) {
      if(_.isArray(s.Resource) && s.Resource.length > 1) {
        res.push(s);
      }
      else {
        const resource = _.isArray(s.Resource) ? s.Resource[0] : s.Resource;
        let actions = resourceToActions.get(resource!);
        if(!actions) {
          actions = [];
          resourceToActions.set(resource!, actions);
        }
        const statementActions = _.isArray(s.Action) ? s.Action : [s.Action!];
        for (const a of statementActions) {
          actions.push(a);
        }        
      }      
    }
    for (const entry of resourceToActions.entries()) {
      res.push({
        Action: entry[1],
        Resource: entry[0],
        Effect: 'Allow',
      });
    }
    return res;
  }
  
  /**
   * Check if effective policy has more permissions than the desired policy (runtime). Will only check for supported services.
   * Only compares allow statements.
   */
  checkExcessPolicyPermissions(effectiveStatements: IamStatement[], desiredStatements: IamStatement[]) {
    const result: IamStatement[] = [];
    const effectiveMapped = this.createPolicyActionMap(effectiveStatements);
    const desiredMapped = this.createPolicyActionMap(desiredStatements);
    //check actions
    for (const entry of effectiveMapped.entries()) {
      const action = entry[0];
      const effectiveResources = entry[1];
      const desiredResources = desiredMapped.get(action);
      if(!desiredResources || (desiredResources.size === 0 && effectiveResources.size > 0)) {
        result.push({
          Action: action,
          Resource: Array.from(effectiveResources!),
          Effect: 'Allow',
        });
        continue;    
      }
      //check that effective resources are contained in desired
      const undesiredResources = [];
      for (const r of effectiveResources!) {
        if(!desiredResources.has(removeAccountIdFromArn(r))) {
          undesiredResources.push(r);
        }
      }
      if(undesiredResources.length > 0) {
        result.push({
          Action: action,
          Resource: undesiredResources,
          Effect: 'Allow',
        });
      }
    }
    if(result.length > 0) {
      return this.uniteStatments(result);
    }
    return undefined;
  }
  
  /**
   * Parse the doc and add statements to the passed array
   * @param doc 
   * @param statemetnts 
   */
  parsePolicyDoc(doc: string | undefined, statements: IamStatement[]) {
    if(doc) {
      const policyDoc = JSON.parse(decodeURIComponent(doc));
      if(!_.isEmpty(policyDoc.Statement)) {
        for (const s of policyDoc.Statement) {
          statements.push(s);    
        }
      }   
    }
    return;
  } 
  
  /**
   * Get a single statements array which combines the various policies attached to a role
   * @param roleName - arn of the desired role
   */
  async getCombinedStatementsForRole(roleName: string) {    
    logger.debug('Going to fetch policies for: ', roleName);
    const promiseArr = [
      this.iam.listAttachedRolePolicies({RoleName: roleName}).promise(),
      this.iam.listRolePolicies({RoleName: roleName}).promise(),
    ];
    const policies: any[] = await Promise.all(promiseArr);
    logger.debug('Done fetching inline and attached policy lists: ', policies);
    const statements: IamStatement[] = [];
    const policyPromisArr: Promise<any>[] = [];
    if(!_.isEmpty(policies[0].AttachedPolicies)) {
      for (const p of policies[0].AttachedPolicies) {
        policyPromisArr.push(this.iam.getPolicy({PolicyArn: p.PolicyArn!}).promise().then((policy) => {
          logger.debug('Done fetching policy: ', policy);
          if(policy.Policy && policy.Policy.DefaultVersionId) {
            return this.iam.getPolicyVersion({PolicyArn: p.PolicyArn!, VersionId: policy.Policy.DefaultVersionId}).promise().then((doc) => {
              logger.debug('Done fetching policy doc: ', doc);
              if(doc.PolicyVersion) {
                this.parsePolicyDoc(doc.PolicyVersion.Document, statements);                            
              }
            });
          }
          return Promise.resolve();
        }));
      }
    }
    if(!_.isEmpty(policies[1].PolicyNames)) {
      for (const p of policies[1].PolicyNames) {
        policyPromisArr.push(this.iam.getRolePolicy({RoleName: roleName, PolicyName: p}).promise().then((policy) => {
          logger.debug('Done fetching inline policy: ', policy);
          this.parsePolicyDoc(policy.PolicyDocument, statements);
          return Promise.resolve();
        }));
      }
    }
    await Promise.all(policyPromisArr);
    return statements;
  }
}
