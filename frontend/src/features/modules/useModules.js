import { useContext } from 'react';
import ModuleContext from './ModuleContext';

const useModules = () => {
  const context = useContext(ModuleContext);
  if (!context) {
    throw new Error('useModules must be used within a ModuleProvider');
  }
  return context;
};

export default useModules;