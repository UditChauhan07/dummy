'use client';

import React, { useEffect, useState } from 'react';
import { signOut } from "next-auth/react";
import { QuestionMarkCircledIcon, SunIcon, MoonIcon, ExitIcon, ChevronRightIcon, HomeIcon } from '@radix-ui/react-icons';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import AvatarIcon from '@/components/ui/AvatarIcon';
import type { IUserWithRoles } from '@/types';
import { usePathname } from 'next/navigation';
import { menuItems, bottomMenuItems, MenuItem } from '@/config/menuConfig';
import { getCurrentUser } from '@/lib/actions/user-actions/userActions';
import { Link } from '@radix-ui/themes';
import { useTheme } from '@/context/ThemeContext';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  rightSidebarOpen: boolean;
  setRightSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleThemeMode: (mode: string) => void;
}

const getMenuItemNameByPath = (path: string): string => {
  const allMenuItems = [...menuItems, ...bottomMenuItems];
  
  const findMenuItem = (items: MenuItem[]): string | null => {
    for (const item of items) {
      if (item.href === path) {
        return item.name;
      }
      if (item.subItems) {
        const subItemName = findMenuItem(item.subItems);
        if (subItemName) return subItemName;
      }
    }
    return null;
  };

  return findMenuItem(allMenuItems) || 'Dashboard';
};

const Header: React.FC<HeaderProps> = ({
  handleThemeMode
}) => {
  const { themeStatus, setThemeStatus } = useTheme();
  const [userData, setUserData] = useState<IUserWithRoles | null>(null);
  
  useEffect(() => {
    const fetchUserData = async () => {
      const user = await getCurrentUser();      
      if (user) {
        setUserData(user);
      }
    };

    fetchUserData();
  }, []);

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
    console.log('Signing out...');
  };

  const getBreadcrumbItems = (path: string): { name: string; href: string }[] => {
    const pathSegments = path.split('/').filter(Boolean);
    const breadcrumbs = [];
    let currentPath = '';
  
    // Always add home
    breadcrumbs.push({
      name: 'Home',
      href: '/'
    });
  
    // Build breadcrumbs from path segments
    for (const segment of pathSegments) {
      currentPath += `/${segment}`;
      const name = getMenuItemNameByPath(currentPath) || segment.charAt(0).toUpperCase() + segment.slice(1);
      breadcrumbs.push({
        name,
        href: currentPath
      });
    }
  
    return breadcrumbs;
  };

  const pathname = usePathname();
  const breadcrumbItems = getBreadcrumbItems(pathname!);  

  const handleThemeToggle = () => {
    const newTheme = themeStatus === "dark" ? "light" : "dark";
    setThemeStatus(newTheme);
    handleThemeMode(newTheme);
  };

  return (
    <header className="bg-transparent py-4 flex items-center justify-between border-b border-main-300 shadow-[0_5px_10px_rgba(0,0,0,0.1)] p-2">
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center space-x-2">
          {breadcrumbItems.map((item, index):JSX.Element => (
            <li key={item.href} className="flex items-center">
              {index > 0 && (
                <ChevronRightIcon className="w-4 h-4 mx-2 text-gray-400" />
              )}
              {index === 0 ? (
                <Link
                  href={item.href}
                  className="text-gray-500 hover:text-main-800 text-md transition-colors cursor-pointer"
                  aria-label="Home"
                >
                  <HomeIcon className="w-5 h-5" />
                </Link>
              ) : index === breadcrumbItems.length - 1 ? (
                <span className="text-xl font-semibold text-main-800">
                  {item.name}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="text-md text-gray-500 hover:text-main-800 transition-colors cursor-pointer"
                >
                  {item.name}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <div className="flex items-center">
        <button
          className="text-main-500 hover:text-gray-700 mr-2"
          aria-label="Help"
        >
          <QuestionMarkCircledIcon className="w-5 h-5" />
        </button>
        <button
          className="text-main-500 hover:text-gray-700 mr-3"
          aria-label="Toggle theme"
          onClick={handleThemeToggle}
        >
          {themeStatus === "dark" ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
        </button>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="relative" aria-label="User menu">
              <AvatarIcon 
                userId={userData?.user_id || ''}
                firstName={userData?.first_name || ''}
                lastName={userData?.last_name || ''}
                size="sm"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></span>
            </button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="min-w-[220px] bg-subMenu-bg rounded-md p-1 shadow-md"
              sideOffset={5}
              align="end"
            >
              <DropdownMenu.Item
                className="text-[13px] leading-none text-subMenu-text rounded-[3px] flex items-center h-[25px] px-[5px] relative pl-[25px] select-none outline-none cursor-pointer"
                onSelect={handleSignOut}
              >
                <ExitIcon className="mr-2 h-3.5 w-3.5" />
                <span>Sign out</span>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}

export default Header;
