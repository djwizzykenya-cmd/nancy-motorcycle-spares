"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import apiClient from "@/lib/api";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  phone?: string;
  userType: "admin" | "seller" | "customer";
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

interface AuthContextType {
  token: string | null;
  user: AuthUser | null;
  isReady: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  logout: () => void;
  isAuthenticated: boolean;
}

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  userType: "customer";
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser) as AuthUser;
      if (parsedUser.userType === "seller") {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      } else {
        setUser(parsedUser);
        if (savedToken) setToken(savedToken);
      }
    } else if (savedToken) {
      setToken(savedToken);
    }
    setIsReady(true);
  }, []);

  const login = async (email: string, password: string): Promise<AuthUser> => {
    const response = await apiClient.post("/auth/login", {
      email: email.trim().toLowerCase(),
      password
    });

    const { token: authToken, user: authUser } = response.data.data as { token: string; user: AuthUser };
    setToken(authToken);
    setUser(authUser);
    localStorage.setItem("token", authToken);
    localStorage.setItem("user", JSON.stringify(authUser));
    return authUser;
  };

  const register = async (input: RegisterInput): Promise<AuthUser> => {
    const response = await apiClient.post("/auth/register", {
      ...input,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone?.trim() || undefined
    });

    const { token: authToken, user: authUser } = response.data.data as { token: string; user: AuthUser };
    setToken(authToken);
    setUser(authUser);
    localStorage.setItem("token", authToken);
    localStorage.setItem("user", JSON.stringify(authUser));
    return authUser;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  if (!isReady) {
    return <>{"Loading..."}</>;
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isReady,
        login,
        register,
        logout,
        isAuthenticated: !!token
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
