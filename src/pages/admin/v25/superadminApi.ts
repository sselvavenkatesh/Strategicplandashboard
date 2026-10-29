import {apiGet, apiPost} from '../../../lib/api';
import type {Assignments, Dataset} from './model';
export type SuperAdminUser={id:string;name:string;email:string};
export type Workspace=Dataset & {assignments:Assignments;stakeholders:{id:string;name:string}[];revision:string};
export const getSuperAdminSession=()=>apiGet<SuperAdminUser>('/api/v1/superadmin/session');
export const getSuperAdminWorkspace=()=>apiGet<Workspace>('/api/v1/superadmin/workspace');
export const saveSuperAdminWorkspace=(revision:string,change:Record<string,unknown>)=>apiPost<Workspace>('/api/v1/superadmin/workspace',{revision,change});
export const loginSuperAdmin=(email:string,password:string)=>apiPost<SuperAdminUser>('/api/v1/superadmin/login',{email,password});
export const logoutSuperAdmin=()=>apiPost<void>('/api/v1/superadmin/logout',{});
