import { createContext, useEffect, useMemo, useState } from 'react';
import { fetchCapabilities } from './moduleApi';

const ModuleContext = createContext(null);

export function ModuleProvider({ children }) {
  const [enabledModules, setEnabledModules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = async () => {
    setIsLoading(true);
    try {
      setEnabledModules(await fetchCapabilities());
      setError('');
    } catch {
      setEnabledModules([]);
      setError('Feature availability could not be loaded.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const value = useMemo(
    () => ({
      enabledModules,
      isLoading,
      error,
      isEnabled: (moduleKey) => enabledModules.includes(moduleKey),
      refresh,
    }),
    [enabledModules, isLoading, error]
  );

  return <ModuleContext.Provider value={value}>{children}</ModuleContext.Provider>;
}

export default ModuleContext;