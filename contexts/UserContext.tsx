import { createContext, useContext } from 'react';
import { UserRole, UserProfile } from '../types';
import firebase from 'firebase/compat/app';

interface UserContextType {
    user: firebase.User | null;
    role: UserRole | null;
    userProfile: UserProfile | null; // Optional if we have the full profile
    loading: boolean;
}

export const UserContext = createContext<UserContextType>({
    user: null,
    role: null,
    userProfile: null,
    loading: true,
});

export const useUser = () => useContext(UserContext);
