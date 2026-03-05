import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile } from '../types';

interface ProfileState extends UserProfile {
  setProfile: (profile: Partial<UserProfile>) => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      nickname: '学习家',
      avatar: 'Felix',
      setProfile: (profile) => set(profile),
    }),
    { name: 'dailyup-profile' },
  ),
);
