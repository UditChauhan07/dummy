'use client';
import React, { useState, useEffect } from 'react';
import TeamList from './TeamList';
import TeamDetails from './TeamDetails';
import { getTeams } from '@/lib/actions/team-actions/teamActions';
import { ITeam } from '@/interfaces/auth.interfaces';

const TeamManagement: React.FC = () => {
  const [teams, setTeams] = useState<ITeam[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<ITeam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const fetchedTeams = await getTeams();
      setTeams(fetchedTeams);
    } catch (err) {
      console.error('Failed to fetch teams:', err);
      setError('Failed to load teams. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTeamUpdate = (updatedTeam: ITeam | null) => {
    if (updatedTeam) {
      setTeams((prevTeams) => prevTeams.map((team):ITeam => 
        team.team_id === updatedTeam.team_id ? updatedTeam : team
      ));
      setSelectedTeam(updatedTeam);
    } else {
      setSelectedTeam(null);
    }
    setError(null);
  };

  if (loading) {
    return <div className="text-text-600">Loading teams...</div>;
  }

  if (error) {
    return (
      <div>
        <p className="text-accent-500 mb-4">{error}</p>
        <button 
          onClick={fetchTeams} 
          className="bg-primary-500 text-white px-4 py-2 rounded hover:bg-primary-600 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex">
      <div className="w-1/3 pr-4">
        <TeamList teams={teams} onSelectTeam={handleTeamUpdate} />
      </div>
      <div className="w-2/3">
        {selectedTeam ? (
          <TeamDetails teamId={selectedTeam.team_id} onUpdate={handleTeamUpdate} />
        ) : (
          <div className="flex items-center justify-center h-full p-8 rounded-lg border border-border-200">
            <p className="text-lg text-text-500">Please select a team to manage members</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamManagement;
