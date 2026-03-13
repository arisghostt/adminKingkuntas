import React, { useMemo } from 'react';
import { ModulePermission } from '../../types/rbac';

interface PermissionMatrixProps {
    permissions: ModulePermission[];
    onChange?: (permissions: ModulePermission[]) => void;
    readOnly?: boolean;
}

const ACTION_KEYS: (keyof Pick<ModulePermission, 'is_view' | 'is_add' | 'is_edit' | 'is_delete'>)[] = [
    'is_view', 'is_add', 'is_edit', 'is_delete'
];

const ACTION_LABELS: Record<string, string> = {
    is_view: 'Voir',
    is_add: 'Ajouter',
    is_edit: 'Modifier',
    is_delete: 'Supprimer',
};

export const PermissionMatrix: React.FC<PermissionMatrixProps> = ({
    permissions,
    onChange,
    readOnly = false,
}) => {

    const handleToggle = (moduleId: number, action: keyof ModulePermission) => {
        if (readOnly || !onChange) return;
        const updated = permissions.map(p => {
            if (p.module_id === moduleId) {
                return { ...p, [action]: !p[action] };
            }
            return p;
        });
        onChange(updated);
    };

    const handleRowCheckAll = (moduleId: number, checked: boolean) => {
        if (readOnly || !onChange) return;
        const updated = permissions.map(p => {
            if (p.module_id === moduleId) {
                return {
                    ...p,
                    is_view: checked,
                    is_add: checked,
                    is_edit: checked,
                    is_delete: checked,
                };
            }
            return p;
        });
        onChange(updated);
    };

    const handleColCheckAll = (action: keyof ModulePermission, checked: boolean) => {
        if (readOnly || !onChange) return;
        const updated = permissions.map(p => ({
            ...p,
            [action]: checked,
        }));
        onChange(updated);
    };

    const handleGlobalCheckAll = (checked: boolean) => {
        if (readOnly || !onChange) return;
        const updated = permissions.map(p => ({
            ...p,
            is_view: checked,
            is_add: checked,
            is_edit: checked,
            is_delete: checked,
        }));
        onChange(updated);
    };

    // Utilities to calculate "Check all" statuses
    const isAllGlobalChecked = useMemo(() => {
        if (!permissions.length) return false;
        return permissions.every(p => p.is_view && p.is_add && p.is_edit && p.is_delete);
    }, [permissions]);

    const isColChecked = (action: keyof ModulePermission) => {
        if (!permissions.length) return false;
        return permissions.every(p => p[action]);
    };

    const isRowChecked = (p: ModulePermission) => {
        return p.is_view && p.is_add && p.is_edit && p.is_delete;
    };

    return (
        <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Modules
                        </th>
                        {ACTION_KEYS.map(action => (
                            <th key={action} scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                <div className="flex flex-col items-center justify-center space-y-1">
                                    <span>{ACTION_LABELS[action]}</span>
                                    {!readOnly && (
                                        <input
                                            type="checkbox"
                                            checked={isColChecked(action)}
                                            onChange={(e) => handleColCheckAll(action, e.target.checked)}
                                            className="form-checkbox h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                        />
                                    )}
                                </div>
                            </th>
                        ))}
                        <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            <div className="flex flex-col items-center justify-center space-y-1">
                                <span>Tout</span>
                                {!readOnly && (
                                    <input
                                        type="checkbox"
                                        checked={isAllGlobalChecked}
                                        onChange={(e) => handleGlobalCheckAll(e.target.checked)}
                                        className="form-checkbox h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    />
                                )}
                            </div>
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {permissions.map((module) => (
                        <tr key={module.module_id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {module.module_name || `Module ${module.module_id}`}
                            </td>
                            {ACTION_KEYS.map(action => (
                                <td key={action} className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                                    <input
                                        type="checkbox"
                                        disabled={readOnly}
                                        checked={Boolean(module[action as keyof typeof module])}
                                        onChange={() => handleToggle(module.module_id, action)}
                                        className={`form-checkbox h-4 w-4 rounded border-gray-300 focus:ring-blue-500 ${readOnly ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 cursor-pointer'
                                            }`}
                                    />
                                </td>
                            ))}
                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                                <input
                                    type="checkbox"
                                    disabled={readOnly}
                                    checked={isRowChecked(module)}
                                    onChange={(e) => handleRowCheckAll(module.module_id, e.target.checked)}
                                    className={`form-checkbox h-4 w-4 rounded border-gray-300 focus:ring-blue-500 ${readOnly ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 cursor-pointer'
                                        }`}
                                />
                            </td>
                        </tr>
                    ))}
                    {permissions.length === 0 && (
                        <tr>
                            <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                                Aucun module trouvé
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};
