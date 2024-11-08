'use client';
import React, { useState, useEffect } from 'react';
import { getTeamById, updateTeam, removeUserFromTeam, assignManagerToTeam, addUserToTeam } from '@/lib/actions/team-actions/teamActions';
import { getAllUsers, getMultipleUsersWithRoles } from '@/lib/actions/user-actions/userActions';
import { ITeam, IUser, IRole, IUserWithRoles } from '@/interfaces/auth.interfaces';

interface TeamDetailsProps {
  teamId: string;
  onUpdate: (updatedTeam: ITeam | null) => void;
}

const TeamDetails: React.FC<TeamDetailsProps> = ({ teamId, onUpdate }): JSX.Element => {
  const [team, setTeam] = useState<ITeam | null>(null);
  const [teamName, setTeamName] = useState('');
  const [allUsers, setAllUsers] = useState<IUser[]>([]);
  const [selectedManagerId, setSelectedManagerId] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTeamDetails();
    fetchAllUsers();
  }, [teamId]);

  const fetchTeamDetails = async (): Promise<void> => {
    try {
      setLoading(true);
      const fetchedTeam = await getTeamById(teamId);
      setTeam(fetchedTeam);
      setTeamName(fetchedTeam.team_name);
      setSelectedManagerId(fetchedTeam.manager_id || '');
      setError(null);
      onUpdate(fetchedTeam);
    } catch (err) {
      console.error('Error fetching team details:', err);
      setError('Failed to fetch team details');
      onUpdate(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async (): Promise<void> => {
    try {
      const users = await getAllUsers();
      setAllUsers(users);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to fetch users');
    }
  };

  const handleTeamNameChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    setTeamName(event.target.value);
  };

  const handleSaveTeamName = async (): Promise<void> => {
    if (team && teamName.trim()) {
      try {
        const updatedTeam = await updateTeam(team.team_id, { team_name: teamName });
        setTeam(updatedTeam);
        onUpdate(updatedTeam);
        setError(null);
      } catch (err) {
        console.error('Error updating team name:', err);
        setError('Failed to update team name');
      }
    }
  };

  const handleRemoveMember = async (userId: string): Promise<void> => {
    if (team) {
      try {
        const updatedTeam = await removeUserFromTeam(team.team_id, userId);
        setTeam(updatedTeam);
        onUpdate(updatedTeam);
        setError(null);
      } catch (err) {
        console.error('Error removing team member:', err);
        setError('Failed to remove team member');
      }
    }
  };

  const handleAssignManager = async (): Promise<void> => {
    if (team && selectedManagerId) {
      try {
        const updatedTeam = await assignManagerToTeam(team.team_id, selectedManagerId);
        setTeam(updatedTeam);
        onUpdate(updatedTeam);
        setError(null);
      } catch (err) {
        console.error('Error assigning manager:', err);
        setError('Failed to assign manager');
      }
    }
  };

  const handleAddMember = async (): Promise<void> => {
    if (team && selectedUserId) {
      try {
        const updatedTeam = await addUserToTeam(team.team_id, selectedUserId);
        setTeam(updatedTeam);
        onUpdate(updatedTeam);
        setSelectedUserId('');
        setError(null);
      } catch (err) {
        console.error('Error adding team member:', err);
        setError('Failed to add team member');
      }
    }
  };

  if (loading) {
    return <div className="text-text-600">Loading team details...</div>;
  }

  if (!team) {
    return <div className="text-text-600">No team found</div>;
  }

  return (
    <div className="space-y-6 p-4 rounded-lg border border-border-200 bg-white">
      {error && <p className="text-accent-500">{error}</p>}
      
      <div>
        <label className="block text-sm font-medium text-text-700 mb-1">Team Name</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={teamName}
            onChange={handleTeamNameChange}
            className="flex-1 p-2 border border-border-200 rounded focus:outline-none focus:border-primary-500"
            placeholder="Enter team name"
          />
          <button
            onClick={handleSaveTeamName}
            className="px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600 transition-colors"
          >
            Save
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-700 mb-1">Team Manager</label>
        <div className="text-text-600 mb-2">
          {team.manager_id 
            ? `${allUsers.find(u => u.user_id === team.manager_id)?.first_name} ${allUsers.find(u => u.user_id === team.manager_id)?.last_name}` 
            : 'No manager assigned'}
        </div>
        <div className="flex gap-2">
          <select
            value={selectedManagerId}
            onChange={(e) => setSelectedManagerId(e.target.value)}
            className="flex-1 p-2 border border-border-200 rounded focus:outline-none focus:border-primary-500"
          >
            <option value="">Select a manager</option>
            {allUsers.map((user):JSX.Element => (
              <option key={user.user_id} value={user.user_id}>
                {user.first_name} {user.last_name}
              </option>
            ))}
          </select>
          <button
            onClick={handleAssignManager}
            className="px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600 transition-colors"
          >
            Assign
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-700 mb-1">Add Team Member</label>
        <div className="flex gap-2">
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="flex-1 p-2 border border-border-200 rounded focus:outline-none focus:border-primary-500"
          >
            <option value="">Select a user</option>
            {allUsers
              .filter(user => !team.members.some(member => member.user_id === user.user_id))
              .map((user):JSX.Element => (
                <option key={user.user_id} value={user.user_id}>
                  {user.first_name} {user.last_name}
                </option>
              ))}
          </select>
          <button
            onClick={handleAddMember}
            className="px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600 transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-700 mb-2">Team Members</label>
        <ul className="space-y-2">
          {team.members.map((member):JSX.Element => (
            <li key={member.user_id} className="flex items-center justify-between p-3 rounded border border-border-200 hover:border-primary-200 transition-colors">
              <div>
                <div className="font-medium text-text-800">
                  {member.first_name} {member.last_name}
                </div>
                <div className="text-sm text-text-600">
                  {member.roles.map((role):string => role.role_name).join(', ')}
                </div>
              </div>
              <button
                onClick={() => handleRemoveMember(member.user_id)}
                className="px-3 py-1 text-accent-500 hover:text-accent-600 transition-colors"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default TeamDetails;
