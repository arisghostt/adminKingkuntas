import { create } from 'zustand';
import { UserMe, ModulePermission } from '../types/rbac';

interface AuthState {
    user: UserMe | null;
    permissions: ModulePermission[];
    isAuthenticated: boolean;
    isLoading: boolean;
    setUser: (user: UserMe | null) => void;
    logout: () => void;
    hasPermission: (moduleUrl: string, action: keyof Omit<ModulePermission, 'module_id' | 'module_name' | 'module_url' | 'is_menu'>) => boolean;
    setLoading: (isLoading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    permissions: [],
    isAuthenticated: false,
    isLoading: true,

    setUser: (user) => set({
        user,
        permissions: user?.permissions || [],
        isAuthenticated: !!user,
        isLoading: false
    }),

    logout: () => set({
        user: null,
        permissions: [],
        isAuthenticated: false,
        isLoading: false
    }),

    hasPermission: (moduleUrl, action) => {
        const { user, permissions } = get();

        // Le superadmin a tous les droits par défaut
        if (user?.is_superadmin) return true;

        // Cherche le module correspondant à l'URL
        const module = permissions.find(p => p.module_url === moduleUrl);
        if (!module) return false;

        // Vérifie si l'action spécifique est autorisée (ex: is_view, is_add, etc.)
        return !!module[action];
    },

    setLoading: (isLoading) => set({ isLoading }),
}));
