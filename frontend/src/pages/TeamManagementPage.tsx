import { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter } from '@dnd-kit/core';
import api from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

interface User {
  id: string;
  name: string;
  email: string;
  role: {
    name: string;
  };
  managerId?: string | null;
}

interface ManagerTeam {
  id: string;
  name: string;
  email: string;
  role: any;
  collaborators: User[];
}

interface TeamData {
  managers: ManagerTeam[];
  unassignedEmployees: User[];
  totalManagers: number;
  totalEmployees: number;
  totalUnassigned: number;
}

export default function TeamManagementPage() {
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingChanges, setPendingChanges] = useState<Array<{ collaboratorId: string; managerId: string | null; collaboratorName: string; managerName: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [expandedManagers, setExpandedManagers] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadTeamData();
  }, []);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/hr/team-management/overview');
      setTeamData(response.data);
      // Expand all managers by default
      setExpandedManagers(new Set(response.data.managers.map((m: ManagerTeam) => m.id)));
    } catch (error: any) {
      console.error('Failed to load team data', error);
      alert(error.response?.data?.message || 'Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const collaboratorId = active.id as string;
    const targetId = over.id as string;

    // Find the collaborator
    let collaborator: User | undefined;
    let oldManagerId: string | null = null;

    // Check in unassigned employees
    collaborator = teamData?.unassignedEmployees.find(e => e.id === collaboratorId);

    // Check in manager teams
    if (!collaborator && teamData) {
      for (const manager of teamData.managers) {
        const found = manager.collaborators.find(c => c.id === collaboratorId);
        if (found) {
          collaborator = found;
          oldManagerId = manager.id;
          break;
        }
      }
    }

    if (!collaborator) return;

    // Determine new manager ID
    let newManagerId: string | null = null;
    let newManagerName = 'Non assigné';

    if (targetId === 'unassigned') {
      newManagerId = null;
    } else if (targetId.startsWith('manager-')) {
      newManagerId = targetId.replace('manager-', '');
      const manager = teamData?.managers.find(m => m.id === newManagerId);
      if (manager) {
        newManagerName = manager.name;
      }
    } else {
      // Dropped on a collaborator, find their manager
      if (teamData) {
        for (const manager of teamData.managers) {
          if (manager.collaborators.some(c => c.id === targetId)) {
            newManagerId = manager.id;
            newManagerName = manager.name;
            break;
          }
        }
      }
    }

    // Don't do anything if dropped on same manager
    if (oldManagerId === newManagerId) return;

    // Update UI immediately
    if (teamData) {
      const newTeamData = { ...teamData };

      // Remove from old location
      if (oldManagerId) {
        const managerIndex = newTeamData.managers.findIndex(m => m.id === oldManagerId);
        if (managerIndex !== -1) {
          newTeamData.managers[managerIndex].collaborators =
            newTeamData.managers[managerIndex].collaborators.filter(c => c.id !== collaboratorId);
        }
      } else {
        newTeamData.unassignedEmployees = newTeamData.unassignedEmployees.filter(e => e.id !== collaboratorId);
      }

      // Add to new location
      if (newManagerId) {
        const managerIndex = newTeamData.managers.findIndex(m => m.id === newManagerId);
        if (managerIndex !== -1) {
          newTeamData.managers[managerIndex].collaborators.push({ ...collaborator, managerId: newManagerId });
        }
      } else {
        newTeamData.unassignedEmployees.push({ ...collaborator, managerId: null });
      }

      setTeamData(newTeamData);
    }

    // Add to pending changes
    setPendingChanges(prev => {
      // Remove any existing change for this collaborator
      const filtered = prev.filter(c => c.collaboratorId !== collaboratorId);
      return [...filtered, {
        collaboratorId,
        managerId: newManagerId,
        collaboratorName: collaborator!.name,
        managerName: newManagerName,
      }];
    });
  };

  const handleSaveChanges = async () => {
    if (pendingChanges.length === 0) {
      alert('Aucune modification à enregistrer');
      return;
    }

    if (!confirm(`Voulez-vous enregistrer ${pendingChanges.length} modification(s) ?`)) {
      return;
    }

    setSaving(true);
    try {
      const assignments = pendingChanges.map(c => ({
        collaboratorId: c.collaboratorId,
        managerId: c.managerId,
      }));

      await api.put('/hr/team-management/batch-assign', {
        assignments,
        notify: true,
      });

      alert('Modifications enregistrées avec succès!');
      setPendingChanges([]);
      await loadTeamData();
    } catch (error: any) {
      console.error('Failed to save changes', error);
      alert(error.response?.data?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelChanges = () => {
    if (pendingChanges.length === 0) return;

    if (!confirm('Voulez-vous annuler toutes les modifications ?')) {
      return;
    }

    setPendingChanges([]);
    loadTeamData();
  };

  const toggleManager = (managerId: string) => {
    setExpandedManagers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(managerId)) {
        newSet.delete(managerId);
      } else {
        newSet.add(managerId);
      }
      return newSet;
    });
  };

  const filteredTeamData = (): TeamData | null => {
    if (!teamData) return null;
    if (!searchTerm) return teamData;

    const term = searchTerm.toLowerCase();
    return {
      ...teamData,
      managers: teamData.managers.map(manager => ({
        ...manager,
        collaborators: manager.collaborators.filter(c =>
          c.name.toLowerCase().includes(term) ||
          c.email.toLowerCase().includes(term)
        ),
      })).filter(manager =>
        manager.name.toLowerCase().includes(term) ||
        manager.email.toLowerCase().includes(term) ||
        manager.collaborators.length > 0
      ),
      unassignedEmployees: teamData.unassignedEmployees.filter(e =>
        e.name.toLowerCase().includes(term) ||
        e.email.toLowerCase().includes(term)
      ),
    };
  };

  const getDraggingUser = (): User | null => {
    if (!activeId || !teamData) return null;

    // Check unassigned
    let user = teamData.unassignedEmployees.find(e => e.id === activeId);
    if (user) return user;

    // Check in managers' teams
    for (const manager of teamData.managers) {
      user = manager.collaborators.find(c => c.id === activeId);
      if (user) return user;
    }

    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  const filtered = filteredTeamData();

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestion des Équipes</h1>
          <p className="text-gray-600">
            Assignez les collaborateurs aux managers par glisser-déposer
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Managers</div>
            <div className="text-2xl font-bold text-biat-primary">{teamData?.totalManagers || 0}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Collaborateurs</div>
            <div className="text-2xl font-bold text-biat-secondary">{teamData?.totalEmployees || 0}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-600">Non assignés</div>
            <div className="text-2xl font-bold text-orange-500">{teamData?.totalUnassigned || 0}</div>
          </div>
        </div>

        {/* Search and Actions */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher un utilisateur..."
            className="w-full sm:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-biat-primary focus:border-transparent"
          />

          <div className="flex gap-2">
            {pendingChanges.length > 0 && (
              <>
                <button
                  onClick={handleCancelChanges}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Annuler ({pendingChanges.length})
                </button>
                <button
                  onClick={handleSaveChanges}
                  disabled={saving}
                  className="px-4 py-2 bg-biat-primary text-white rounded-lg hover:bg-biat-accent transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <LoadingSpinner />}
                  Enregistrer ({pendingChanges.length})
                </button>
              </>
            )}
          </div>
        </div>

        {/* Pending Changes Preview */}
        {pendingChanges.length > 0 && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Modifications en attente:</h3>
            <div className="space-y-1 text-sm text-blue-800">
              {pendingChanges.map((change, idx) => (
                <div key={idx}>
                  • {change.collaboratorName} → {change.managerName}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Managers Column */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Managers et leurs équipes</h2>
            {filtered?.managers.map((manager) => (
              <ManagerCard
                key={manager.id}
                manager={manager}
                isExpanded={expandedManagers.has(manager.id)}
                onToggle={() => toggleManager(manager.id)}
              />
            ))}
            {filtered?.managers.length === 0 && (
              <div className="text-center py-12 text-gray-500">Aucun manager trouvé</div>
            )}
          </div>

          {/* Unassigned Column */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Collaborateurs non assignés</h2>
            <UnassignedZone employees={filtered?.unassignedEmployees || []} />
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeId ? (
          <div className="bg-white border-2 border-biat-primary rounded-lg p-3 shadow-lg opacity-90">
            <div className="font-semibold">{getDraggingUser()?.name}</div>
            <div className="text-sm text-gray-600">{getDraggingUser()?.email}</div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// Manager Card Component
function ManagerCard({ manager, isExpanded, onToggle }: {
  manager: ManagerTeam;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-white rounded-lg shadow-md border-2 border-gray-200 overflow-hidden">
      {/* Manager Header - Drop Zone */}
      <Droppable id={`manager-${manager.id}`}>
        <div
          className="p-4 bg-gradient-to-r from-biat-primary to-biat-secondary text-white cursor-pointer hover:opacity-90 transition-opacity"
          onClick={onToggle}
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="font-bold text-lg">{manager.name}</div>
              <div className="text-sm opacity-90">{manager.email}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-white text-biat-primary px-3 py-1 rounded-full text-sm font-semibold">
                {manager.collaborators.length} membre{manager.collaborators.length !== 1 ? 's' : ''}
              </div>
              <svg
                className={`w-6 h-6 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </Droppable>

      {/* Collaborators List */}
      {isExpanded && (
        <div className="p-4 space-y-2 bg-gray-50">
          {manager.collaborators.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Aucun collaborateur assigné
              <br />
              <span className="text-sm">Glissez des utilisateurs ici pour les assigner</span>
            </div>
          ) : (
            manager.collaborators.map((collab) => (
              <DraggableUser key={collab.id} user={collab} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Unassigned Zone Component
function UnassignedZone({ employees }: { employees: User[] }) {
  return (
    <Droppable id="unassigned">
      <div className="bg-white rounded-lg shadow-md border-2 border-dashed border-orange-300 p-4 min-h-96">
        {employees.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-4">✓</div>
            <div>Tous les collaborateurs sont assignés!</div>
          </div>
        ) : (
          <div className="space-y-2">
            {employees.map((employee) => (
              <DraggableUser key={employee.id} user={employee} />
            ))}
          </div>
        )}
      </div>
    </Droppable>
  );
}

// Draggable User Component
function DraggableUser({ user }: { user: User }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: user.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`bg-white border-2 border-gray-300 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-biat-primary hover:shadow-md transition-all ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="font-semibold text-gray-900">{user.name}</div>
      <div className="text-sm text-gray-600">{user.email}</div>
      <div className="text-xs text-gray-500 mt-1">{user.role.name}</div>
    </div>
  );
}

// Droppable Zone Component
function Droppable({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`transition-all ${isOver ? 'ring-4 ring-biat-primary ring-opacity-50' : ''}`}
    >
      {children}
    </div>
  );
}

// Import hooks from dnd-kit
import { useDraggable, useDroppable } from '@dnd-kit/core';
