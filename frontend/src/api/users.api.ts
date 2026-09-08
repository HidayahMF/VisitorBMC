import { apiClient } from './client';
export interface ManagedUser { id:number; username:string; name:string; role:'ADMIN'|'SECURITY'; isActive:boolean; employeeActive:boolean; }
export async function listUsers(){return apiClient<ManagedUser[]>('/users');}
export async function addUser(username:string,role:ManagedUser['role']){return apiClient<ManagedUser>('/users',{method:'POST',body:JSON.stringify({username,role})});}
export async function updateUser(id:number,data:Partial<Pick<ManagedUser,'role'|'isActive'>>){return apiClient<ManagedUser>(`/users/${id}`,{method:'PATCH',body:JSON.stringify(data)});}
