import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { ListManagementSection } from '../components/ListManagementSection';
import { AppSettings, User } from '../types';
import { getAppSettings, updateAppSettings, updateCompanyInfo, getCompanyInfo, updateUserProfile, changeUserPassword, uploadFileToStorage } from '../services/supabaseService';
import { useAuth } from '../hooks/useAuth';
import { DEFAULT_PROFILE_PIC, UploadIcon } from '../constants';

type SettingsTab = 'General' | 'My Profile' | 'User Management';

const SectionWrapper: React.FC<{title: string, children: React.ReactNode, onSubmit?: (e: React.FormEvent) => Promise<void> | void, submitText?: string, isSubmittingForm?: boolean, key?: string}> = ({title, children, onSubmit, submitText, isSubmittingForm}) => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
    <div className="bg-gradient-to-r from-brand-primary to-brand-primary-light px-8 py-6">
      <h3 className="text-xl font-bold text-white">{title}</h3>
    </div>
    <form onSubmit={onSubmit} className="p-8">
      <div className="space-y-6">
        {children}
      </div>
      {onSubmit && submitText && (
        <div className="mt-8 pt-6 border-t border-slate-200 flex justify-end">
          <button 
            type="submit" 
            className="btn-primary px-8 py-3 text-base font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200" 
            disabled={isSubmittingForm}
          >
            {isSubmittingForm ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </div>
            ) : submitText}
          </button>
        </div>
      )}
    </form>
  </div>
);

const ModernListSection: React.FC<{title: string, items: string[], onAddItem: (item: string) => Promise<void>, onRemoveItem: (item: string) => Promise<void>, isLoading?: boolean, icon: string}> = ({title, items, onAddItem, onRemoveItem, isLoading, icon}) => {
  const [newItem, setNewItem] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddItem = async () => {
    if (!newItem.trim()) return;
    setIsSubmitting(true);
    try {
      await onAddItem(newItem.trim());
      setNewItem('');
    } catch (error) {
      console.error(`Error adding ${title.slice(0,-1)}:`, error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveItem = async (itemToRemove: string) => {
    setIsSubmitting(true);
    try {
      await onRemoveItem(itemToRemove);
    } catch (error) {
      console.error(`Error removing ${title.slice(0,-1)}:`, error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const disabled = isLoading || isSubmitting;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden hover:shadow-md transition-shadow duration-300">
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200/60">
        <div className="flex items-center">
          <span className="text-2xl mr-3">{icon}</span>
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
        </div>
      </div>
      <div className="p-6">
        <div className="mb-6 flex gap-3 items-center">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder={`Add new ${title.slice(0, -1).toLowerCase()}`}
            className="input-base flex-grow focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all duration-200"
            disabled={disabled}
            onKeyDown={(e) => e.key === 'Enter' && !disabled && newItem.trim() && handleAddItem()}
          />
          <button
            onClick={handleAddItem}
            disabled={disabled || !newItem.trim()}
            className="btn-secondary px-6 py-2.5 font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200"
            type="button"
          >
            Add
          </button>
        </div>
        
        {isLoading && <p className="text-sm text-slate-500 py-6 text-center">Loading {title.toLowerCase()}...</p>}
        {!isLoading && items.length === 0 && (
          <div className="text-center py-8">
            <div className="text-slate-400 text-4xl mb-2">📝</div>
            <p className="text-slate-500 text-sm">No {title.toLowerCase()} added yet</p>
          </div>
        )}
        {items.length > 0 && (
          <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-sleek">
            {items.map((item) => (
              <div
                key={item}
                className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-slate-100/50 rounded-xl border border-slate-200/60 hover:from-slate-100 hover:to-slate-200/50 transition-all duration-200 group"
              >
                <span className="text-sm font-medium text-slate-700">{item}</span>
                <button
                  onClick={() => handleRemoveItem(item)}
                  disabled={disabled}
                  className="text-slate-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 disabled:opacity-50 transition-all duration-200 opacity-0 group-hover:opacity-100"
                  title={`Remove ${item}`}
                  type="button"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const SettingsPage: React.FC = () => {
  const location = useLocation();
  const initialTab = (location.state as { initialTab: SettingsTab })?.initialTab || 'General';
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [companyInfo, setCompanyInfo] = useState<{name: string, address: string, logoUrl: string, currency: string}>({name: '', address: '', logoUrl: '', currency: ''});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user:authUser, updateUserProfileInContext } = useAuth(); 
  const [profileData, setProfileData] = useState<{displayName: string, email: string, profilePictureUrl: string}>({displayName: '', email: '', profilePictureUrl: ''});
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string>('');
  
  const [companyLogoFile, setCompanyLogoFile] = useState<File | null>(null);
  const [companyLogoPreview, setCompanyLogoPreview] = useState<string>('');

  const [passwordData, setPasswordData] = useState({currentPassword: '', newPassword: '', confirmNewPassword: ''});

  const fetchSettingsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [settings, compInfoResult] = await Promise.all([
        getAppSettings(),
        getCompanyInfo()
      ]);
      setAppSettings(settings);
      const currentCompanyInfo = compInfoResult || {name: '', address: '', logoUrl: '', currency: ''};
      setCompanyInfo(currentCompanyInfo);
      setCompanyLogoPreview(currentCompanyInfo.logoUrl || '');

      if (authUser) {
        setProfileData({displayName: authUser.displayName || '', email: authUser.email || '', profilePictureUrl: authUser.profilePictureUrl || ''});
        setProfileImagePreview(authUser.profilePictureUrl || DEFAULT_PROFILE_PIC);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      alert("Failed to load settings data.");
    } finally {
      setIsLoading(false);
    }
  }, [authUser]);

  useEffect(() => {
    fetchSettingsData();
  }, [fetchSettingsData]);

  const handleUpdateList = async (listName: keyof Pick<AppSettings, 'departments' | 'positions' | 'employeeTypes' | 'statuses' | 'documentTypes'>, items: string[]) => {
    if (!appSettings) return;
    try {
      const updatedSettings = { ...appSettings, [listName]: items };
      await updateAppSettings(updatedSettings); 
      setAppSettings(updatedSettings); 
    } catch (error) {
      console.error(`Error updating ${listName}:`, error);
      alert(`Failed to update ${listName}. ${error instanceof Error ? error.message : String(error)}`);
      throw error; 
    }
  };

  const handleAddItem = useCallback((listName: keyof Pick<AppSettings, 'departments' | 'positions' | 'employeeTypes' | 'statuses' | 'documentTypes'>) => async (item: string) => {
    if (!appSettings || !appSettings[listName]) return;
    const newList = [...appSettings[listName], item];
    await handleUpdateList(listName, newList);
  }, [appSettings]);

  const handleRemoveItem = useCallback((listName: keyof Pick<AppSettings, 'departments' | 'positions' | 'employeeTypes' | 'statuses' | 'documentTypes'>) => async (item: string) => {
    if (!appSettings || !appSettings[listName]) return;
    const newList = appSettings[listName].filter(i => i !== item);
    await handleUpdateList(listName, newList);
  }, [appSettings]);
  
  const handleCompanyInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setCompanyInfo({...companyInfo, [e.target.name]: e.target.value });
  };

  const handleCompanyLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCompanyLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanyLogoPreview(reader.result as string || '');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCompanyInfoSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let finalLogoUrl = companyInfo.logoUrl || ''; 
      if (companyLogoFile) {
        const logoPath = `company_assets/logo_${Date.now()}_${companyLogoFile.name}`;
        finalLogoUrl = await uploadFileToStorage(companyLogoFile, logoPath);
      }

      const updatedCompanyInfo = {
        ...companyInfo,
        logoUrl: finalLogoUrl,
      };
      await updateCompanyInfo(updatedCompanyInfo);
      setCompanyInfo(updatedCompanyInfo); 
      setCompanyLogoPreview(updatedCompanyInfo.logoUrl || '');
      setCompanyLogoFile(null); 
      alert("Company information updated successfully!");
    } catch (error) {
      console.error("Error updating company info:", error);
      alert("Failed to update company information.");
    } finally {
      setIsSubmitting(false);
    }
  }, [companyInfo, companyLogoFile]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileData({...profileData, [e.target.name]: e.target.value});
  };

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfileImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result as string || '');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileUpdate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser) return;
    setIsSubmitting(true);
    try {
      let newProfilePictureUrl = profileData.profilePictureUrl || '';
      if (profileImageFile) {
        newProfilePictureUrl = profileImagePreview || ''; 
      }
      
      const updatedProfilePayload = {
        displayName: profileData.displayName,
        photoURL: newProfilePictureUrl || ''
      };

      await updateUserProfile(updatedProfilePayload);
      await updateUserProfileInContext(); 
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert(`Failed to update profile. ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [authUser, profileData, profileImageFile, profileImagePreview, updateUserProfileInContext]);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({...passwordData, [e.target.name]: e.target.value});
  };

  const handlePasswordUpdate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmNewPassword) {
      alert("New passwords do not match.");
      return;
    }
    if (!passwordData.currentPassword || !passwordData.newPassword) {
      alert("Please fill in all password fields.");
      return;
    }
    setIsSubmitting(true);
    try {
      await changeUserPassword(passwordData.currentPassword, passwordData.newPassword); 
      alert("Password changed successfully!");
      setPasswordData({currentPassword: '', newPassword: '', confirmNewPassword: ''});
    } catch (error) {
      console.error("Error changing password:", error);
      alert(`Failed to change password. ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  }, [passwordData]);

  const renderGeneralSettings = () => (
    <div className="space-y-8">
      <SectionWrapper 
        key="company-info-section" 
        title="Company Information" 
        onSubmit={handleCompanyInfoSubmit} 
        submitText="Save Company Info" 
        isSubmittingForm={isSubmitting}
      >
        <div className="flex flex-col items-center mb-8">
          <label className="block text-sm font-semibold text-slate-700 mb-4 self-start">Company Logo</label>
          <div className="relative group">
            <div className="w-48 h-32 mb-4 border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden shadow-inner group-hover:border-brand-accent transition-all duration-300">
              {companyLogoPreview ? (
                <img
                  src={companyLogoPreview}
                  alt="Company Logo Preview"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="text-center">
                  <div className="text-slate-400 text-4xl mb-2">🏢</div>
                  <span className="text-slate-400 text-sm">No logo uploaded</span>
                </div>
              )}
            </div>
            <label htmlFor="companyLogoUpload" className="btn-secondary px-6 py-2.5 font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
              <UploadIcon />
              <span className="ml-2">Change Logo</span>
            </label>
            <input type="file" id="companyLogoUpload" onChange={handleCompanyLogoFileChange} accept="image/*" className="hidden" disabled={isSubmitting} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="companyName" className="block text-sm font-semibold text-slate-700 mb-2">Company Name</label>
            <input 
              type="text" 
              name="name" 
              id="companyName" 
              value={companyInfo.name || ''} 
              onChange={handleCompanyInfoChange} 
              className="input-base focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all duration-200" 
              placeholder="Enter your company name"
            />
          </div>
          <div>
            <label htmlFor="companyCurrency" className="block text-sm font-semibold text-slate-700 mb-2">Currency Symbol</label>
            <input 
              type="text" 
              name="currency" 
              id="companyCurrency" 
              value={companyInfo.currency || ''} 
              onChange={handleCompanyInfoChange} 
              className="input-base focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all duration-200" 
              placeholder="e.g., $, €, £"
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="companyAddress" className="block text-sm font-semibold text-slate-700 mb-2">Company Address</label>
            <textarea 
              name="address" 
              id="companyAddress" 
              value={companyInfo.address || ''} 
              onChange={handleCompanyInfoChange} 
              rows={3} 
              className="input-base focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all duration-200" 
              placeholder="Enter your complete business address"
            />
          </div>
        </div>
      </SectionWrapper>

      {appSettings && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <ModernListSection title="Departments" items={appSettings.departments || []} onAddItem={handleAddItem('departments')} onRemoveItem={handleRemoveItem('departments')} isLoading={isLoading} icon="🏢" />
          <ModernListSection title="Positions" items={appSettings.positions || []} onAddItem={handleAddItem('positions')} onRemoveItem={handleRemoveItem('positions')} isLoading={isLoading} icon="💼" />
          <ModernListSection title="Employee Types" items={appSettings.employeeTypes || []} onAddItem={handleAddItem('employeeTypes')} onRemoveItem={handleRemoveItem('employeeTypes')} isLoading={isLoading} icon="👥" />
          <ModernListSection title="Employee Statuses" items={appSettings.statuses || []} onAddItem={handleAddItem('statuses')} onRemoveItem={handleRemoveItem('statuses')} isLoading={isLoading} icon="📊" />
          <div className="lg:col-span-2">
            <ModernListSection title="Document Types" items={appSettings.documentTypes || []} onAddItem={handleAddItem('documentTypes')} onRemoveItem={handleRemoveItem('documentTypes')} isLoading={isLoading} icon="📄" />
          </div>
        </div>
      )}
    </div>
  );

  const renderMyProfileSettings = () => (
    <div className="space-y-8">
      <SectionWrapper key="profile-info-section" title="My Profile Information" onSubmit={handleProfileUpdate} submitText="Update Profile" isSubmittingForm={isSubmitting}>
        <div className="flex flex-col items-center mb-8">
          <div className="relative group">
            <img 
              src={profileImagePreview || DEFAULT_PROFILE_PIC} 
              alt="Profile" 
              className="w-32 h-32 rounded-full object-cover mb-4 border-4 border-white shadow-lg ring-4 ring-slate-200 group-hover:ring-brand-accent transition-all duration-300"
            />
            <label htmlFor="profilePictureUrl" className="btn-secondary px-6 py-2.5 font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
              <UploadIcon />
              <span className="ml-2">Change Photo</span>
            </label>
            <input type="file" id="profilePictureUrl" name="profilePictureUrl" onChange={handleProfileImageChange} accept="image/*" className="hidden" disabled={isSubmitting} />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="displayName" className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
            <input 
              type="text" 
              name="displayName" 
              id="displayName" 
              value={profileData.displayName || ''} 
              onChange={handleProfileChange} 
              className="input-base focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all duration-200" 
              disabled={isSubmitting}
              placeholder="Enter your full name"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
            <input 
              type="email" 
              name="email" 
              id="email" 
              value={profileData.email || ''} 
              onChange={handleProfileChange} 
              className="input-base bg-slate-100 cursor-not-allowed" 
              disabled={true} 
              readOnly
            />
            <p className="text-xs text-slate-500 mt-2">Email address changes are complex and currently disabled in this form.</p>
          </div>
        </div>
      </SectionWrapper>

      <SectionWrapper key="change-password-section" title="Change Password" onSubmit={handlePasswordUpdate} submitText="Change Password" isSubmittingForm={isSubmitting}>
        <div className="space-y-6 max-w-md">
          <div>
            <label htmlFor="currentPassword_id" className="block text-sm font-semibold text-slate-700 mb-2">Current Password</label>
            <input 
              type="password" 
              name="currentPassword" 
              id="currentPassword_id" 
              value={passwordData.currentPassword || ''} 
              onChange={handlePasswordChange} 
              className="input-base focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all duration-200" 
              disabled={isSubmitting} 
              autoComplete="current-password"
              placeholder="Enter your current password"
            />
          </div>
          <div>
            <label htmlFor="newPassword_id" className="block text-sm font-semibold text-slate-700 mb-2">New Password</label>
            <input 
              type="password" 
              name="newPassword" 
              id="newPassword_id" 
              value={passwordData.newPassword || ''} 
              onChange={handlePasswordChange} 
              className="input-base focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all duration-200" 
              disabled={isSubmitting} 
              autoComplete="new-password"
              placeholder="Enter your new password"
            />
          </div>
          <div>
            <label htmlFor="confirmNewPassword_id" className="block text-sm font-semibold text-slate-700 mb-2">Confirm New Password</label>
            <input 
              type="password" 
              name="confirmNewPassword" 
              id="confirmNewPassword_id" 
              value={passwordData.confirmNewPassword || ''} 
              onChange={handlePasswordChange} 
              className="input-base focus:ring-2 focus:ring-brand-accent/20 focus:border-brand-accent transition-all duration-200" 
              disabled={isSubmitting} 
              autoComplete="new-password"
              placeholder="Confirm your new password"
            />
          </div>
        </div>
      </SectionWrapper>
    </div>
  );

  const renderUserManagementSettings = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
      <div className="bg-gradient-to-r from-brand-primary to-brand-primary-light px-8 py-6">
        <h3 className="text-xl font-bold text-white">User Management (System Admins)</h3>
      </div>
      <div className="p-8">
        <div className="text-center py-16">
          <div className="text-6xl mb-4">👥</div>
          <p className="text-slate-600 mb-4">This section will allow management of system administrators. Features include adding new admins, editing roles/permissions, and deactivating admin accounts.</p>
          <p className="text-slate-500 text-sm mb-8">(Placeholder: Full implementation of user management with Firebase Auth (creating users) and Firestore (storing roles) will be added later. This often involves Cloud Functions for secure user creation.)</p>
          <button className="btn-secondary px-8 py-3 font-semibold shadow-md" disabled>
            Add Admin (Coming Soon)
          </button>
        </div>
      </div>
    </div>
  );

  if (isLoading && !appSettings && !companyInfo.name) {
    return (
      <div className="flex flex-col justify-center items-center h-96 text-slate-500">
        <svg className="animate-spin h-12 w-12 text-brand-accent mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-xl font-semibold">Loading settings...</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-brand-primary mb-2">Settings</h1>
        <p className="text-slate-600">Manage your application preferences and configurations</p>
      </div>
      
      <div className="mb-8">
        <nav className="flex space-x-1 bg-slate-100 p-1 rounded-xl" aria-label="Tabs">
          {(['General', 'My Profile', 'User Management'] as SettingsTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 px-6 text-sm font-semibold rounded-lg transition-all duration-200 ${
                activeTab === tab
                  ? 'bg-white text-brand-primary shadow-sm'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200/50'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>
      
      <div className="pb-8">
        {activeTab === 'General' && renderGeneralSettings()}
        {activeTab === 'My Profile' && renderMyProfileSettings()}
        {activeTab === 'User Management' && renderUserManagementSettings()}
      </div>
    </div>
  );
};

export default SettingsPage;