import { useState } from 'react';

export function useShellMenuState() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showTabBarMenu, setShowTabBarMenu] = useState(false);

  return {
    showNotifications,
    setShowNotifications,
    showProfileMenu,
    setShowProfileMenu,
    showTabBarMenu,
    setShowTabBarMenu,
  };
}
