'use client';
import { useState, useEffect } from 'react';
import { IUserWithRoles } from '@/interfaces/auth.interfaces';
import { getMultipleUsersWithRoles } from '@/lib/actions/user-actions/userActions';
import UserList from '@/components/settings/general/UserList';
import { Button } from '@radix-ui/themes';

export default function UsersPage() {
  const [users, setUsers] = useState<IUserWithRoles[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const fetchedUsers = await getMultipleUsersWithRoles([]);  // Fetch all users
      setUsers(fetchedUsers);
    } catch (err) {
      console.error('Failed to fetch users:', err);
      setError('Failed to load users. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchUsers();
  };

  if (loading) {
    return <div>Loading users...</div>;
  }

  if (error) {
    return (
      <div>
        <p>Error: {error}</p>
        <Button onClick={handleRefresh} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Users</h1>
        <Button onClick={handleRefresh}>
          Refresh
        </Button>
      </div>
      <UserList onUpdate={fetchUsers} onDeleteUser={fetchUsers} users={users} />
    </div>
  );
}
