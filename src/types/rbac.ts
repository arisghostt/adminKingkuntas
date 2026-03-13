export interface ModulePermission {
    module_id: number;
    module_name?: string;
    module_url?: string;
    is_menu?: boolean;
    is_view: boolean;
    is_add: boolean;
    is_edit: boolean;
    is_delete: boolean;
}

export interface Role {
    id: number;
    name: string;
    description: string;
    color: string;
    userCount?: number;
    permissions?: any[];
    module_permissions: ModulePermission[];
}

export interface RolePayload {
    name: string;
    description: string;
    color: string;
    module_permissions: {
        module_id: number;
        is_view: boolean;
        is_add: boolean;
        is_edit: boolean;
        is_delete: boolean;
    }[];
}

export interface Tenant {
    id: number;
    name: string;
}

export interface User {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    phone: string;
    is_active: boolean;
    date_joined: string;
    role: {
        id: number;
        name: string;
    };
    tenant: Tenant;
}

export interface UserMe {
    id: number;
    username: string;
    is_superadmin: boolean;
    role: {
        id: number;
        name: string;
    };
    permissions: ModulePermission[];
}

export interface PaginatedResponse<T> {
    count: number;
    next?: string | null;
    previous?: string | null;
    results: T[];
}

export interface CreateUserPayload {
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    phone: string;
    password?: string;
    role_id: number;
    tenant_id: number;
    is_active: boolean;
}

export interface AssignRolePayload {
    role_id: number;
}
