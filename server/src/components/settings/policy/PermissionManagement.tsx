'use client';

import { useState, useEffect, useCallback } from 'react';
import { Flex, Text, Select, Checkbox } from '@radix-ui/themes';
import { getPermissions, getRoles, getRolePermissions, assignPermissionToRole, removePermissionFromRole } from '@/lib/actions/policyActions';
import { IPermission, IRole } from '@/interfaces/auth.interfaces';
import { DataTable } from '@/components/ui/DataTable';
import { ColumnDefinition } from '@/interfaces/dataTable.interfaces';

export default function PermissionManagement() {
  const [permissions, setPermissions] = useState<IPermission[]>([]);
  const [roles, setRoles] = useState<IRole[]>([]);
  const [selectedResource, setSelectedResource] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [rolePermissions, setRolePermissions] = useState<string[]>([]);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    try {
      const fetchedPermissions = await getPermissions();
      console.log('Fetched permissions:', fetchedPermissions);
      setPermissions(fetchedPermissions);
    } catch (err) {
      console.error('Error fetching permissions:', err);
      setError('Failed to fetch permissions');
    }
  }, []);

  const fetchRoles = useCallback(async () => {
    try {
      const fetchedRoles = await getRoles();
      console.log('Fetched roles:', fetchedRoles);
      setRoles(fetchedRoles);
    } catch (err) {
      console.error('Error fetching roles:', err);
      setError('Failed to fetch roles');
    }
  }, []);

  const fetchRolePermissions = useCallback(async (roleId: string) => {
    try {
      const fetchedRolePermissions = await getRolePermissions(roleId);
      console.log('Fetched role permissions:', fetchedRolePermissions);
      setRolePermissions(fetchedRolePermissions.map((p: IPermission): string => p.permission_id));
    } catch (err) {
      console.error('Error fetching role permissions:', err);
      setError('Failed to fetch role permissions');
    }
  }, []);

  useEffect(() => {
    const initializeComponent = async () => {
      await Promise.all([
        fetchPermissions(),
        fetchRoles()
      ]);
    };
    initializeComponent();
  }, [fetchPermissions, fetchRoles]);

  useEffect(() => {
    if (roles.length > 0) {
      const adminRole = roles.find(role => role.role_name === 'Admin');
      if (adminRole) {
        setSelectedRole(adminRole.role_id);
        fetchRolePermissions(adminRole.role_id);
      }
    }
  }, [roles, fetchRolePermissions]);

  useEffect(() => {
    if (selectedRole) {
      fetchRolePermissions(selectedRole);
    }
  }, [selectedRole, fetchRolePermissions]);

  const handlePermissionAssignment = async (permissionId: string, isAssigned: boolean) => {
    if (!selectedRole || isUpdating) return;

    setIsUpdating(true);
    setError(null);
    
    try {
      if (isAssigned) {
        await assignPermissionToRole(selectedRole, permissionId);
        setRolePermissions(prev => [...prev, permissionId]);
      } else {
        await removePermissionFromRole(selectedRole, permissionId);
        setRolePermissions(prev => prev.filter(id => id !== permissionId));
      }
    } catch (err) {
      console.error('Error updating permission:', err);
      setError('Failed to update permission');
      // Revert on error
      await fetchRolePermissions(selectedRole);
    } finally {
      setIsUpdating(false);
    }
  };

  const resources = Array.from(new Set(permissions.map((p: IPermission): string => p.resource)));

  const columns: ColumnDefinition<IPermission>[] = [
    {
      title: 'Resource',
      dataIndex: 'resource',
    },
    {
      title: 'Action',
      dataIndex: 'action',
    },
    {
      title: 'Allowed',
      dataIndex: 'permission_id',
      render: (value: string, record: IPermission) => (
        selectedRole && (
          <Checkbox 
            checked={rolePermissions.includes(record.permission_id)}
            onCheckedChange={(checked) => {
              if (typeof checked === 'boolean') {
                handlePermissionAssignment(record.permission_id, checked);
              }
            }}
            disabled={isUpdating}
          />
        )
      ),
    },
  ];

  const filteredPermissions = permissions.filter(p => 
    !selectedResource || selectedResource === 'all' || p.resource === selectedResource
  );

  if (permissions.length === 0 || roles.length === 0) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <Flex direction="column" gap="4">
        <Text size="5" weight="bold">Manage Permissions</Text>
        {error && (
          <Text color="red" size="2">{error}</Text>
        )}
        <Flex direction="column" gap="2">
          <Flex align="center" gap="2">
            <Text size="2" weight="bold" style={{ width: '100px' }}>Resource:</Text>
            <Select.Root value={selectedResource || 'all'} onValueChange={setSelectedResource}>
              <Select.Trigger placeholder="Select Resource" />
              <Select.Content>
                <Select.Item value="all">All Resources</Select.Item>
                {resources.map((resource: string): JSX.Element => (
                  <Select.Item key={resource} value={resource}>
                    {resource}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Flex>
          <Flex align="center" gap="2">
            <Text size="2" weight="bold" style={{ width: '100px' }}>Role:</Text>
            <Select.Root value={selectedRole} onValueChange={setSelectedRole}>
              <Select.Trigger placeholder="Select Role" />
              <Select.Content>
                {roles.map((role: IRole): JSX.Element => (
                  <Select.Item key={role.role_id} value={role.role_id}>
                    {role.role_name}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Flex>
        </Flex>
        
        <DataTable
          data={filteredPermissions}
          columns={columns}
          pagination={false}
        />
      </Flex>
    </div>
  );
}
