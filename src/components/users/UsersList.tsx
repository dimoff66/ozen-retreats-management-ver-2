'use client';

import { useEffect, useState } from "react";
import ActionBar from "@/components/common/ActionBar";
import UserForm from "@/components/users/UserForm";
import type { UserFormData } from "@/components/users/UserForm";
import type { CreateUser, Retreat, Role, User } from "@/services/database";
import retreatsService from "@/services/retreatsService";
import rolesService from "@/services/rolesService";
import usersService from "@/services/usersService";
import { useCurrentUser } from "@/contexts/CurrentUserContext";

export default function UsersList() {
  const strTitle = "Users";
  const strColumnName = "Name";
  const strColumnLogin = "Login";
  const strColumnRole = "Role";
  const strColumnRetreat = "Retreat";
  const strNoRetreat = "-";
  const strLoading = "Loading...";
  const strLoadError = "Failed to load users.";
  const strSaveError = "Failed to save user.";
  const strDeleteError = "Failed to delete user.";
  const strDeleteConfirm = "Delete selected user?";
  const strCannotDeleteCurrentUser = "You cannot delete the currently selected user.";

  const { currentUser, setCurrentUser, setUsers } = useCurrentUser();
  const [users, setLocalUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [retreats, setRetreats] = useState<Retreat[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");

  const loadData = async () => {
    setIsLoading(true);
    setLoadError("");

    try {
      const [usersData, rolesData, retreatsData] = await Promise.all([
        usersService.getUsers(),
        rolesService.getRoles(),
        retreatsService.getRetreats(),
      ]);

      setLocalUsers(usersData);
      setUsers(usersData);
      setRoles(rolesData);
      setRetreats(retreatsData);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : strLoadError);
    } finally {
      setIsLoading(false);
    }
  };

  const onAddActionClick = () => {
    setActionError("");
    setEditingUser(null);
    setIsFormOpen(true);
  };

  const onEditActionClick = (user: User) => {
    setActionError("");
    setEditingUser(user);
    setIsFormOpen(true);
  };

  const onDeleteActionClick = async (user: User) => {
    if (user.id === currentUser?.id) {
      setActionError(strCannotDeleteCurrentUser);
      return;
    }

    if (!window.confirm(strDeleteConfirm)) {
      return;
    }

    setActionError("");

    try {
      await usersService.deleteUser(user.id);
      setSelectedUser(null);
      await loadData();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : strDeleteError);
    }
  };

  const onCancelActionClick = () => {
    setIsFormOpen(false);
    setEditingUser(null);
    setActionError("");
  };

  const onSaveActionClick = async (data: UserFormData) => {
    setActionError("");

    try {
      let savedUser: User;

      if (editingUser) {
        savedUser = await usersService.updateUser(editingUser.id, data);
        if (currentUser?.id === savedUser.id) {
          setCurrentUser(savedUser);
        }
      } else {
        if (!data.password) {
          setActionError(strSaveError);
          return;
        }

        const createData: CreateUser = {
          name: data.name,
          login: data.login,
          password: data.password,
          role: data.role,
          retreat_id: data.retreat_id,
        };
        savedUser = await usersService.createUser(createData);
      }

      setIsFormOpen(false);
      setEditingUser(null);
      setSelectedUser(null);
      await loadData();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : strSaveError);
    }
  };

  const userRows = users.map((user) => {
    const retreat = retreats.find((item) => item.id === user.retreat_id);
    const isSelected = selectedUser?.id === user.id;

    const onRowClick = () => {
      setSelectedUser(user);
      setActionError("");
    };

    return {
      ...user,
      retreatTitle: retreat?.title ?? strNoRetreat,
      isSelected,
      onRowClick,
    };
  });

  useEffect(() => {
    let isCancelled = false;

    const loadInitialData = async () => {
      try {
        const [usersData, rolesData, retreatsData] = await Promise.all([
          usersService.getUsers(),
          rolesService.getRoles(),
          retreatsService.getRetreats(),
        ]);

        if (isCancelled) {
          return;
        }

        setLocalUsers(usersData);
        setUsers(usersData);
        setRoles(rolesData);
        setRetreats(retreatsData);
      } catch (error) {
        if (!isCancelled) {
          setLoadError(error instanceof Error ? error.message : strLoadError);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadInitialData();

    return () => {
      isCancelled = true;
    };
  }, [setUsers]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{strTitle}</h1>
      <ActionBar
        selectedItem={selectedUser}
        onAddActionClick={onAddActionClick}
        onEditActionClick={onEditActionClick}
        onDeleteActionClick={onDeleteActionClick}
      />
      {actionError && !isFormOpen ? <div role="alert" className="mb-4 text-red-600">{actionError}</div> : null}
      {isLoading ? <div>{strLoading}</div> : null}
      {loadError ? <div role="alert" className="text-red-600">{loadError}</div> : null}
      {!isLoading && !loadError ? (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">{strColumnName}</th>
                <th className="px-4 py-3 text-left">{strColumnLogin}</th>
                <th className="px-4 py-3 text-left">{strColumnRole}</th>
                <th className="px-4 py-3 text-left">{strColumnRetreat}</th>
              </tr>
            </thead>
            <tbody>
              {userRows.map((user) => (
                <tr
                  key={user.id}
                  onClick={user.onRowClick}
                  className={user.isSelected ? "cursor-pointer border-t border-gray-200 bg-blue-50" : "cursor-pointer border-t border-gray-200 hover:bg-gray-50"}
                >
                  <td className="px-4 py-3">{user.name}</td>
                  <td className="px-4 py-3">{user.login}</td>
                  <td className="px-4 py-3">{user.role}</td>
                  <td className="px-4 py-3">{user.retreatTitle}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {isFormOpen ? (
        <UserForm
          user={editingUser}
          roles={roles}
          retreats={retreats}
          actionError={actionError}
          onSaveActionClick={onSaveActionClick}
          onCancelActionClick={onCancelActionClick}
        />
      ) : null}
    </div>
  );
}
