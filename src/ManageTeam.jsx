import { useState, useEffect } from "react";
import Loader from "./components/Loader";

const ManageTeam = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    full_name: "",
    email: "",
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const clientId = localStorage.getItem("user_id");
  const token = localStorage.getItem("access_token");

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://api.xlitecore.xdialnetworks.com/api/v1/client/employees/${clientId}`,
        {
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch team members");

      const data = await response.json();
      setEmployees(data.employees || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError("");

    try {
      const response = await fetch(
        `https://api.xlitecore.xdialnetworks.com/api/v1/client/employees/${clientId}`,
        {
          method: "POST",
          headers: {
            accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to add team member");
      }

      setSuccessMessage("Team member added successfully!");
      setShowAddModal(false);
      setFormData({ username: "", password: "", full_name: "", email: "" });
      fetchEmployees();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError("");

    try {
      const response = await fetch(
        `https://api.xlitecore.xdialnetworks.com/api/v1/client/employees/${clientId}/employees/${selectedEmployee.id}/password`,
        {
          method: "PATCH",
          headers: {
            accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ password: formData.password }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to update password");
      }

      setSuccessMessage("Password updated successfully!");
      setShowEditModal(false);
      setFormData({ username: "", password: "", full_name: "", email: "" });
      setSelectedEmployee(null);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteEmployee = async (employeeId) => {
    if (!window.confirm("Are you sure you want to remove this team member?")) return;

    try {
      const response = await fetch(
        `https://api.xlitecore.xdialnetworks.com/api/v1/client/employees/${clientId}/employees/${employeeId}`,
        {
          method: "DELETE",
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to delete team member");

      setSuccessMessage("Team member removed successfully!");
      fetchEmployees();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleActive = async (employee) => {
    try {
      const response = await fetch(
        `https://api.xlitecore.xdialnetworks.com/api/v1/client/employees/${clientId}/employees/${employee.id}/toggle-active`,
        {
          method: "PATCH",
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to toggle status");

      setSuccessMessage(
        `Team member ${employee.is_active ? "deactivated" : "activated"} successfully!`
      );
      fetchEmployees();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const openEditModal = (employee) => {
    setSelectedEmployee(employee);
    setFormData({ username: "", password: "", full_name: "", email: "" });
    setShowEditModal(true);
  };

  if (loading) {
    return (
      <>
        <style>{styles}</style>
        <div className="loading-container">
          <Loader size="large" />
          <p>Loading team members...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="container">
        {/* Header */}
        <div className="header">
          <div className="header-left">
            <button
              className="back-btn"
              onClick={() => (window.location.href = "/dashboard?view=dashboard")}
            >
              <i className="bi bi-arrow-left"></i>
              Back
            </button>
            <h1>Manage Team Members</h1>
          </div>
          <button className="add-btn" onClick={() => setShowAddModal(true)}>
            <i className="bi bi-person-plus-fill"></i>
            Add Team Member
          </button>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="success-banner">
            <i className="bi bi-check-circle-fill"></i>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="error-banner">
            <i className="bi bi-exclamation-circle-fill"></i>
            <span>{error}</span>
            <button onClick={() => setError("")}>
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
        )}

        {/* Team Members Table */}
        <div className="table-card">
          <div className="table-header">
            <h2>Team Members ({employees.length})</h2>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="empty-state">
                      <i className="bi bi-people"></i>
                      <p>No team members yet</p>
                      <span>Add your first team member to get started</span>
                    </td>
                  </tr>
                ) : (
                  employees.map((employee) => (
                    <tr key={employee.id}>
                      <td>
                        <div className="username-cell">
                          <i className="bi bi-person-circle"></i>
                          {employee.username}
                        </div>
                      </td>
                      <td>{employee.full_name || "N/A"}</td>
                      <td>{employee.email || "N/A"}</td>
                      <td>
                        <div className="status-cell">
                          <label className="toggle-switch">
                            <input
                              type="checkbox"
                              checked={employee.is_active}
                              onChange={() => handleToggleActive(employee)}
                            />
                            <span className="slider"></span>
                          </label>
                          <span
                            className={`status-badge ${employee.is_active ? "active" : "inactive"
                              }`}
                          >
                            {employee.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="action-btn edit"
                            onClick={() => openEditModal(employee)}
                            title="Change Password"
                          >
                            <i className="bi bi-key-fill"></i>
                          </button>
                          <button
                            className="action-btn delete"
                            onClick={() => handleDeleteEmployee(employee.id)}
                            title="Remove Member"
                          >
                            <i className="bi bi-trash-fill"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Employee Modal */}
        {showAddModal && (
          <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Add Team Member</h2>
                <button
                  className="close-btn"
                  onClick={() => setShowAddModal(false)}
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>
              <form onSubmit={handleAddEmployee}>
                <div className="form-group">
                  <label>Username *</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    placeholder="Enter username"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Password *</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="Enter password"
                    required
                    minLength="6"
                  />
                </div>
                <div className="form-group">
                  <label>Full Name</label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    placeholder="Enter full name"
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="Enter email"
                  />
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="submit-btn"
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <>
                        <i className="bi bi-arrow-repeat spin"></i>
                        Adding...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-person-plus-fill"></i>
                        Add Member
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Password Modal */}
        {showEditModal && selectedEmployee && (
          <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Change Password</h2>
                <button
                  className="close-btn"
                  onClick={() => setShowEditModal(false)}
                >
                  <i className="bi bi-x-lg"></i>
                </button>
              </div>
              <div className="employee-info">
                <i className="bi bi-person-circle"></i>
                <div>
                  <p className="employee-name">{selectedEmployee.full_name || selectedEmployee.username}</p>
                  <p className="employee-username">@{selectedEmployee.username}</p>
                </div>
              </div>
              <form onSubmit={handleUpdatePassword}>
                <div className="form-group">
                  <label>New Password *</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="Enter new password"
                    required
                    minLength="6"
                  />
                  <small>Password must be at least 6 characters</small>
                </div>
                <div className="modal-actions">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => setShowEditModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="submit-btn"
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <>
                        <i className="bi bi-arrow-repeat spin"></i>
                        Updating...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-key-fill"></i>
                        Update Password
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

const styles = `
  @import url('https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.2/font/bootstrap-icons.css');
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background-color: #F9FAFB;
    color: #111827;
    line-height: 1.3;
    font-size: 14px;
    padding: 1.5rem;
    zoom: 0.75;
  }

  .container {
    max-width: 1400px;
    margin: 0 auto;
  }

  /* Loading & Error */
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    gap: 1rem;
  }

  }

  /* Header */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .header h1 {
    font-size: 1.875rem;
    font-weight: 600;
    color: #111827;
  }

  .back-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.625rem 1rem;
    background: white;
    border: 1px solid #E5E7EB;
    border-radius: 8px;
    color: #6B7280;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    font-family: 'Inter', sans-serif;
  }

  .back-btn:hover {
    background: #F9FAFB;
    border-color: #D1D5DB;
    color: #4B5563;
  }

  .add-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.25rem;
    background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
    border: none;
    border-radius: 8px;
    color: white;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    font-family: 'Inter', sans-serif;
  }

  .add-btn:hover {
    background: linear-gradient(135deg, #3730A3 0%, #6D28D9 100%);
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
    transform: translateY(-2px);
  }

  /* Banners */
  .success-banner,
  .error-banner {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .success-banner {
    background: #D1FAE5;
    border: 1px solid #A7F3D0;
    color: #059669;
  }

  .error-banner {
    background: #FEE2E2;
    border: 1px solid #FCA5A5;
    color: #DC2626;
    justify-content: space-between;
  }

  .error-banner button {
    background: none;
    border: none;
    color: #DC2626;
    cursor: pointer;
    padding: 0.25rem;
    display: flex;
    align-items: center;
  }

  /* Table Card */
  .table-card {
    background: white;
    border: 1px solid #F3F4F6;
    border-radius: 12px;
    overflow: hidden;
  }

  .table-header {
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid #F3F4F6;
  }

  .table-header h2 {
    font-size: 1.125rem;
    font-weight: 600;
    color: #111827;
  }

  .table-wrapper {
    overflow-x: auto;
  }

  table {
    width: 100%;
    border-collapse: collapse;
  }

  thead {
    background: #F9FAFB;
  }

  th {
    padding: 1rem 1.5rem;
    text-align: left;
    font-size: 0.75rem;
    font-weight: 600;
    color: #6B7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  td {
    padding: 1rem 1.5rem;
    border-top: 1px solid #F3F4F6;
    font-size: 0.875rem;
    color: #111827;
  }

  tr:hover {
    background: #F9FAFB;
  }

  .username-cell {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 500;
  }

  .username-cell i {
    font-size: 1.25rem;
    color: #4F46E5;
  }

  .status-cell {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  /* Toggle Switch */
  .toggle-switch {
    position: relative;
    display: inline-block;
    width: 44px;
    height: 24px;
    flex-shrink: 0;
  }

  .toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #E5E7EB;
    transition: 0.3s;
    border-radius: 24px;
  }

  .slider:before {
    position: absolute;
    content: "";
    height: 18px;
    width: 18px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
  }

  input:checked + .slider {
    background-color: #10B981;
  }

  input:checked + .slider:before {
    transform: translateX(20px);
  }

  .status-badge {
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .status-badge.active {
    background: #D1FAE5;
    color: #059669;
  }

  .status-badge.inactive {
    background: #FEE2E2;
    color: #DC2626;
  }

  /* Action Buttons */
  .action-buttons {
    display: flex;
    gap: 0.5rem;
  }

  .action-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #E5E7EB;
    border-radius: 6px;
    background: white;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 0.875rem;
  }

  .action-btn.edit {
    color: #4F46E5;
  }

  .action-btn.edit:hover {
    background: #EDE9FE;
    border-color: #4F46E5;
  }

  .action-btn.delete {
    color: #DC2626;
  }

  .action-btn.delete:hover {
    background: #FEE2E2;
    border-color: #DC2626;
  }

  /* Empty State */
  .empty-state {
    text-align: center;
    padding: 3rem 1rem !important;
  }

  .empty-state i {
    font-size: 3rem;
    color: #D1D5DB;
    margin-bottom: 1rem;
  }

  .empty-state p {
    font-size: 1rem;
    font-weight: 500;
    color: #6B7280;
    margin-bottom: 0.25rem;
  }

  .empty-state span {
    font-size: 0.875rem;
    color: #9CA3AF;
  }

  /* Modal */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .modal-content {
    background: white;
    border-radius: 12px;
    width: 100%;
    max-width: 500px;
    max-height: 90vh;
    overflow-y: auto;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid #F3F4F6;
  }

  .modal-header h2 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #111827;
  }

  .close-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: none;
    border: none;
    color: #6B7280;
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.2s;
  }

  .close-btn:hover {
    background: #F3F4F6;
    color: #111827;
  }

  .employee-info {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.5rem;
    background: #F9FAFB;
    border-bottom: 1px solid #F3F4F6;
  }

  .employee-info i {
    font-size: 2.5rem;
    color: #4F46E5;
  }

  .employee-name {
    font-weight: 600;
    color: #111827;
    margin-bottom: 0.25rem;
  }

  .employee-username {
    font-size: 0.875rem;
    color: #6B7280;
  }

  form {
    padding: 1.5rem;
  }

  .form-group {
    margin-bottom: 1.25rem;
  }

  .form-group label {
    display: block;
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    margin-bottom: 0.5rem;
  }

  .form-group input {
    width: 100%;
    padding: 0.75rem 1rem;
    border: 1px solid #E5E7EB;
    border-radius: 8px;
    font-size: 0.875rem;
    font-family: 'Inter', sans-serif;
    transition: all 0.2s;
  }

  .form-group input:focus {
    outline: none;
    border-color: #4F46E5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
  }

  .form-group small {
    display: block;
    font-size: 0.75rem;
    color: #9CA3AF;
    margin-top: 0.5rem;
  }

  .modal-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
    margin-top: 1.5rem;
  }

  .cancel-btn,
  .submit-btn {
    padding: 0.75rem 1.25rem;
    border-radius: 8px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    font-family: 'Inter', sans-serif;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .cancel-btn {
    background: white;
    border: 1px solid #E5E7EB;
    color: #6B7280;
  }

  .cancel-btn:hover {
    background: #F9FAFB;
    border-color: #D1D5DB;
  }

  .submit-btn {
    background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
    border: none;
    color: white;
  }

  .submit-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, #3730A3 0%, #6D28D9 100%);
    box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
  }

  .submit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .header {
      flex-direction: column;
      align-items: stretch;
    }

    .header-left {
      flex-direction: column;
      align-items: stretch;
    }

    .add-btn {
      width: 100%;
      justify-content: center;
    }

    table {
      font-size: 0.75rem;
    }

    th, td {
      padding: 0.75rem 1rem;
    }
  }
`;

export default ManageTeam;