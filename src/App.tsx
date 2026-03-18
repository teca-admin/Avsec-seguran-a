/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import Login from './components/Login';
import Layout from './components/Layout';
import Posto from './components/Posto';
import Supervisor from './components/Supervisor';
import { Canal } from './types';

export default function App() {
  const [user, setUser] = useState<Canal | null>(null);
  const [turno, setTurno] = useState('B');

  const handleLogin = (canal: Canal) => {
    setUser(canal);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Layout user={user} onLogout={handleLogout} turno={turno}>
      {user === 'supervisor' ? (
        <Supervisor turno={turno} />
      ) : (
        <Posto 
          canal={user} 
          turno={turno} 
          onTurnoChange={setTurno} 
        />
      )}
    </Layout>
  );
}
