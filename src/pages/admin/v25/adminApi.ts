import {apiGet,apiPost} from '../../../lib/api';
import type {DataRow} from './model';
import type {SuperAdminUser,Workspace} from './superadminApi';
export const getAdminSession=()=>apiGet<SuperAdminUser>('/api/v1/admin/session');
export const loginAdmin=(email:string,password:string)=>apiPost<SuperAdminUser>('/api/v1/admin/login',{email,password});
export const logoutAdmin=()=>apiPost<void>('/api/v1/admin/logout',{});
export const getAdminWorkspace=()=>apiGet<Workspace>('/api/v1/admin/workspace');
export const saveAdminWorkspace=(revision:string,kind:string,rows:DataRow[])=>apiPost<Workspace>('/api/v1/admin/workspace',{revision,kind,rows});
