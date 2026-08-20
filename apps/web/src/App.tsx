import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import AppShell from './layout/AppShell';
import { PageLoading } from './ui/components';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import Onboarding from './pages/Onboarding';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Chat = lazy(() => import('./pages/Chat'));
const Memories = lazy(() => import('./pages/Memories'));
const MemoryDetail = lazy(() => import('./pages/MemoryDetail'));
const Journal = lazy(() => import('./pages/Journal'));
const JournalDetail = lazy(() => import('./pages/JournalDetail'));
const Photos = lazy(() => import('./pages/Photos'));
const Albums = lazy(() => import('./pages/Albums'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Moods = lazy(() => import('./pages/Moods'));
const MoodHistory = lazy(() => import('./pages/MoodHistory'));
const Period = lazy(() => import('./pages/Period'));
const Questions = lazy(() => import('./pages/Questions'));
const LoveLetters = lazy(() => import('./pages/LoveLetters'));
const Story = lazy(() => import('./pages/Story'));
const Countdowns = lazy(() => import('./pages/Countdowns'));
const Wishlist = lazy(() => import('./pages/Wishlist'));
const BucketList = lazy(() => import('./pages/BucketList'));
const DatePlanner = lazy(() => import('./pages/DatePlanner'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Expenses = lazy(() => import('./pages/Expenses'));
const LoveLanguage = lazy(() => import('./pages/LoveLanguage'));
const Relationship = lazy(() => import('./pages/Relationship'));
const Compliments = lazy(() => import('./pages/Compliments'));
const AI = lazy(() => import('./pages/AI'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Profile = lazy(() => import('./pages/Profile'));
const More = lazy(() => import('./pages/More'));
const SettingsHub = lazy(() => import('./pages/Settings'));
const Security = lazy(() => import('./pages/SecuritySettings'));
const Privacy = lazy(() => import('./pages/PrivacySettings'));
const Backup = lazy(() => import('./pages/BackupSettings'));
const NotifSettings = lazy(() => import('./pages/NotificationSettings'));
const StorageSettings = lazy(() => import('./pages/StorageSettings'));
const ExportPage = lazy(() => import('./pages/ExportPage'));
const NotFound = lazy(() => import('./pages/NotFound'));

function FullLoading() {
  return <div className="min-h-dvh flex items-center justify-center"><PageLoading /></div>;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { me, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <FullLoading />;
  if (!me) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  return <>{children}</>;
}

function RequireCouple() {
  const { me, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <FullLoading />;
  if (!me) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (!me.couple) return <Navigate to="/onboarding" replace />;
  return <AppShell />;
}

export default function App() {
  return (
    <Suspense fallback={<FullLoading />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />

        <Route element={<RequireCouple />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/memories" element={<Memories />} />
          <Route path="/memories/:id" element={<MemoryDetail />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/journal/:id" element={<JournalDetail />} />
          <Route path="/photos" element={<Photos />} />
          <Route path="/albums" element={<Albums />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/moods" element={<Moods />} />
          <Route path="/mood-history" element={<MoodHistory />} />
          <Route path="/period" element={<Period />} />
          <Route path="/pms" element={<Period />} />
          <Route path="/questions" element={<Questions />} />
          <Route path="/love-letters" element={<LoveLetters />} />
          <Route path="/story" element={<Story />} />
          <Route path="/countdowns" element={<Countdowns />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/bucket-list" element={<BucketList />} />
          <Route path="/date-planner" element={<DatePlanner />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/love-language" element={<LoveLanguage />} />
          <Route path="/relationship" element={<Relationship />} />
          <Route path="/compliments" element={<Compliments />} />
          <Route path="/ai" element={<AI />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/couple" element={<Profile coupleView />} />
          <Route path="/more" element={<More />} />
          <Route path="/settings" element={<SettingsHub />} />
          <Route path="/settings/security" element={<Security />} />
          <Route path="/settings/privacy" element={<Privacy />} />
          <Route path="/settings/backup" element={<Backup />} />
          <Route path="/settings/notifications" element={<NotifSettings />} />
          <Route path="/settings/storage" element={<StorageSettings />} />
          <Route path="/export" element={<ExportPage />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
