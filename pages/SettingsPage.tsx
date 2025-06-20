import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { ListManagementSection } from '../components/ListManagementSection';
import { AppSettings, User } from '../types';
import { getAppSettings, updateAppSettings, updateCompanyInfo, getCompanyInfo, updateUserProfile, changeUserPassword, uploadFileToStorage } from '../services/supabaseService';
import { useAuth } from '../hooks/useAuth';
import { DEFAULT_PROFILE_PIC, UploadIcon } from '../constants';

type SettingsTab = 'General' | 'My Profile' | 'User Management';

const SectionWrapper: React.FC<{title: string, children: React.ReactNode, onSubmit?: (e: React.FormEvent) => Promise<void> | void, submitText?: string, isSubmittingForm?: boolean, key?: string}> = ({title, children, onSubmit, submitText, isSubmittingForm}) => (
  <form onSubmit={onSubmit} className="p-6 bg-white shadow-card rounded-xl">
      <h3 className="text-xl font-bold text-brand-primary mb-6 pb-3 border-b border-slate-300">{title}</h3>
      <div className="space-y-4">
       {children}
      </div>
      {onSubmit && submitText && (
          <div className="mt-8 pt-5 border-t border-slate-200 text-right">
          <button type="submit" className="btn-secondary" disabled={isSubmittingForm}>{isSubmittingForm ? 'Saving...' : submitText}</button>
          </div>
      )}
  </form>
);


const SettingsPage: React.FC = () => {
  const location = useLocation();
  const initialTab = (location.state as { initialTab: SettingsTab })?.initialTab || 'General';
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [companyInfo, setCompanyInfo] = useState<{name: string, address: string, logoUrl: string, currency: string}>({name: '', address: '', logoUrl: '', currency: ''});
  const [isLoading, setIsLoading] = useState(true); // General loading for initial data
  const [isSubmitting, setIsSubmitting] = useState(false); // For specific form submissions

  const { user:authUser, updateUserProfileInContext } = useAuth(); 
  const [profileData, setProfileData] = useState<{displayName: string, email: string, profilePictureUrl?: string}>({displayName: '', email: ''});
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  
  const [companyLogoFile, setCompanyLogoFile] = useState<File | null>(null);
  const [companyLogoPreview, setCompanyLogoPreview] = useState<string | null>(null);

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
      setCompanyLogoPreview(currentCompanyInfo.logoUrl || null);


      if (authUser) {
        setProfileData({displayName: authUser.displayName || '', email: authUser.email || '', profilePictureUrl: authUser.profilePictureUrl});
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
        setCompanyLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCompanyInfoSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let finalLogoUrl = companyInfo.logoUrl; 
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
      setCompanyLogoPreview(updatedCompanyInfo.logoUrl);
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
        setProfileImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileUpdate = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser) return;
    setIsSubmitting(true);
    try {
      let newProfilePictureUrl = profileData.profilePictureUrl;
      if (profileImageFile) {
        newProfilePictureUrl = profileImagePreview || undefined; 
      }
      
      const updatedProfilePayload = {
        displayName: profileData.displayName,
        photoURL: newProfilePictureUrl 
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
    <div className="space-y-6">
      <SectionWrapper 
        key="company-info-section" 
        title="Company Information" 
        onSubmit={handleCompanyInfoSubmit} 
        submitText="Save Company Info" 
        isSubmittingForm={isSubmitting}
      >
        <div className="flex flex-col items-center mb-6 pt-2 pb-5 border-b border-slate-200">
          <label className="block text-sm font-semibold text-slate-700 mb-2 self-start">Company Logo</label>
          <div className="w-full sm:w-60 h-32 mb-3 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center bg-slate-50 overflow-hidden shadow-inner">
            {companyLogoPreview ? (
              <img
                src={companyLogoPreview}
                alt="Company Logo Preview"
                className="max-w-full max-h-full object-contain"
              />
            ) : (
              <span className="text-slate-400 text-xs px-2 text-center">No logo uploaded</span>
            )}
          </div>
          <label htmlFor="companyLogoUpload" className="btn btn-ghost text-sm py-1.5 px-3 cursor-pointer">
            <UploadIcon />
            <span className="ml-2">Change Logo</span>
          </label>
          <input type="file" id="companyLogoUpload" onChange={handleCompanyLogoFileChange} accept="image/*" className="hidden" disabled={isSubmitting} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <label htmlFor="companyName" className="block text-sm font-semibold text-slate-700 mb-1">Company Name</label>
            <input type="text" name="name" id="companyName" value={companyInfo.name} onChange={handleCompanyInfoChange} className="input-base" />
          </div>
          <div>
            <label htmlFor="companyCurrency" className="block text-sm font-semibold text-slate-700 mb-1">Currency Symbol</label>
            <input type="text" name="currency" id="companyCurrency" value={companyInfo.currency} onChange={handleCompanyInfoChange} className="input-base" placeholder="e.g., $, €, £"/>
          </div>
          <div className="md:col-span-2">
            <label htmlFor="companyAddress" className="block text-sm font-semibold text-slate-700 mb-1">Company Address</label>
            <textarea name="address" id="companyAddress" value={companyInfo.address} onChange={handleCompanyInfoChange} rows={3} className="input-base" />
          </div>
        </div>
      </SectionWrapper>

      {appSettings && (
        <>
          <ListManagementSection title="Departments" items={appSettings.departments} onAddItem={handleAddItem('departments')} onRemoveItem={handleRemoveItem('departments')} isLoading={isLoading} />
          <ListManagementSection title="Positions" items={appSettings.positions} onAddItem={handleAddItem('positions')} onRemoveItem={handleRemoveItem('positions')} isLoading={isLoading} />
          <ListManagementSection title="Employee Types" items={appSettings.employeeTypes} onAddItem={handleAddItem('employeeTypes')} onRemoveItem={handleRemoveItem('employeeTypes')} isLoading={isLoading} />
          <ListManagementSection title="Employee Statuses" items={appSettings.statuses} onAddItem={handleAddItem('statuses')} onRemoveItem={handleRemoveItem('statuses')} isLoading={isLoading} />
          <ListManagementSection title="Document Types" items={appSettings.documentTypes} onAddItem={handleAddItem('documentTypes')} onRemoveItem={handleRemoveItem('documentTypes')} isLoading={isLoading} />
        </>
      )}
    </div>
  );

  const renderMyProfileSettings = () => (
    <div className="space-y-6">
      <SectionWrapper key="profile-info-section" title="My Profile Information" onSubmit={handleProfileUpdate} submitText="Update Profile" isSubmittingForm={isSubmitting}>
         <div className="flex flex-col items-center mb-2">
          <img 
            src={profileImagePreview || DEFAULT_PROFILE_PIC} 
            alt="Profile" 
            className="w-32 h-32 rounded-full object-cover mb-3 border-4 border-slate-200 shadow-sm"
          />
          <label htmlFor="profilePictureUrl" className="btn btn-ghost text-sm py-1.5 px-3 cursor-pointer">
            <UploadIcon />
            <span className="ml-2">Change Photo</span>
          </label>
          <input type="file" id="profilePictureUrl" name="profilePictureUrl" onChange={handleProfileImageChange} accept="image/*" className="hidden" disabled={isSubmitting} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          <div>
            <label htmlFor="displayName" className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
            <input type="text" name="displayName" id="displayName" value={profileData.displayName} onChange={handleProfileChange} className="input-base" disabled={isSubmitting}/>
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
            <input type="email" name="email" id="email" value={profileData.email} onChange={handleProfileChange} className="input-base" disabled={isSubmitting || true} readOnly/>
             <p className="text-xs text-slate-500 mt-1">Email address changes are complex and currently disabled in this form.</p>
          </div>
        </div>
      </SectionWrapper>

      <SectionWrapper key="change-password-section" title="Change Password" onSubmit={handlePasswordUpdate} submitText="Change Password" isSubmittingForm={isSubmitting}>
        <div className="space-y-4 max-w-md">
           <div>
            <label htmlFor="currentPassword_id" className="block text-sm font-semibold text-slate-700 mb-1">Current Password</label>
            <input type="password" name="currentPassword" id="currentPassword_id" value={passwordData.currentPassword} onChange={handlePasswordChange} className="input-base" disabled={isSubmitting} autoComplete="current-password" />
          </div>
          <div>
            <label htmlFor="newPassword_id" className="block text-sm font-semibold text-slate-700 mb-1">New Password</label>
            <input type="password" name="newPassword" id="newPassword_id" value={passwordData.newPassword} onChange={handlePasswordChange} className="input-base" disabled={isSubmitting} autoComplete="new-password" />
          </div>
          <div>
            <label htmlFor="confirmNewPassword_id" className="block text-sm font-semibold text-slate-700 mb-1">Confirm New Password</label>
            <input type="password" name="confirmNewPassword" id="confirmNewPassword_id" value={passwordData.confirmNewPassword} onChange={handlePasswordChange} className="input-base" disabled={isSubmitting} autoComplete="new-password" />
          </div>
        </div>
      </SectionWrapper>
    </div>
  );

  const renderUserManagementSettings = () => (
    <SectionWrapper key="user-management-section" title="User Management (System Admins)">
      <p className="text-slate-600">This section will allow management of system administrators. Features include adding new admins, editing roles/permissions, and deactivating admin accounts.</p>
      <p className="text-slate-500 text-sm mt-2"> (Placeholder: Full implementation of user management with Firebase Auth (creating users) and Firestore (storing roles) will be added later. This often involves Cloud Functions for secure user creation.)</p>
      <div className="mt-6">
        <button className="btn-secondary" disabled>
          Add Admin (Coming Soon)
        </button>
      </div>
      <div className="mt-6 border border-dashed border-slate-300 rounded-lg p-10 text-center text-slate-400">
        <p>Admin user list will appear here.</p>
      </div>
    </SectionWrapper>
  );

  if (isLoading && !appSettings && !companyInfo.name) {
     return (
      <div className="flex flex-col justify-center items-center h-96 text-slate-500">
        <svg className="animate-spin h-8 w-8 text-brand-accent mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-lg">Loading settings...</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-brand-primary mb-6 md:mb-8">Settings</h1>
      <div className="mb-6 border-b border-slate-200">
        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
          {(['General', 'My Profile', 'User Management'] as SettingsTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm
                ${activeTab === tab
                  ? 'border-brand-accent text-brand-accent'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }
              `}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>
      <div className="py-2">
        {activeTab === 'General' && renderGeneralSettings()}
        {activeTab === 'My Profile' && renderMyProfileSettings()}
        {activeTab === 'User Management' && renderUserManagementSettings()}
      </div>
    </div>
  );
};

export default SettingsPage;