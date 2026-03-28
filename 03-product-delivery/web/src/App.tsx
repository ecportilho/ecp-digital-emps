import { Routes, Route, Navigate } from 'react-router-dom';
import { SidebarPJ } from './components/layout/SidebarPJ';
import { HeaderPJ } from './components/layout/HeaderPJ';
import { AppRoutes } from './routes';

export function App() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <SidebarPJ />
      <div className="flex flex-1 flex-col overflow-hidden">
        <HeaderPJ />
        <main className="flex-1 overflow-y-auto p-6">
          <AppRoutes />
        </main>
      </div>
    </div>
  );
}
