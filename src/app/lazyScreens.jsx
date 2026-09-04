import React from 'react';
import { LocalizedRouteLoadError } from './routeHelpers';

export const AdminScreen = React.lazy(() => import('../components/screens/AdminScreen'));

let homeScreenModulePromise;
let catalogScreenModulePromise;
const loadHomeScreen = () => (homeScreenModulePromise ||= import('../components/screens/HomeScreen'));
const loadCatalogScreen = () => (catalogScreenModulePromise ||= import('../components/screens/CatalogScreen'));

export const HomeScreen = React.lazy(loadHomeScreen);
export const CatalogScreen = React.lazy(loadCatalogScreen);

if (window.location.pathname === '/listings' || (window.location.pathname === '/' && window.location.search)) {
  loadCatalogScreen();
} else if (window.location.pathname === '/') {
  loadHomeScreen();
}

export const PostScreen = React.lazy(() => import('../components/screens/PostScreenWithAutofill'));
export const SellerLandingScreen = React.lazy(() => import('../components/screens/SellerLandingScreen').catch(() => ({ default: () => <LocalizedRouteLoadError translationKey="route_load_error" /> })));
export const UserDashboard = React.lazy(() => import('../components/screens/UserDashboard'));
export const AdDetailScreen = React.lazy(() => import('../components/screens/AdDetailScreen').catch(() => ({ default: () => <LocalizedRouteLoadError translationKey="error_loading_ad" /> })));
export const StorefrontScreen = React.lazy(() => import('../components/screens/StorefrontScreen').catch(() => ({ default: () => <LocalizedRouteLoadError translationKey="route_load_error" /> })));
export const EditAdScreen = React.lazy(() => import('../components/screens/EditAdScreen').catch(() => ({ default: () => <LocalizedRouteLoadError translationKey="route_load_error" /> })));
export const SellerProfileScreen = React.lazy(() => import('../components/screens/SellerProfileScreen').catch(() => ({ default: () => <LocalizedRouteLoadError translationKey="route_load_error" /> })));
export const AutosLanding = React.lazy(() => import('../components/screens/verticals/AutosLanding').catch(() => ({ default: () => <LocalizedRouteLoadError translationKey="route_load_error" /> })));
export const InmueblesLanding = React.lazy(() => import('../components/screens/verticals/InmueblesLanding').catch(() => ({ default: () => <LocalizedRouteLoadError translationKey="route_load_error" /> })));
export const EmpleosLanding = React.lazy(() => import('../components/screens/verticals/EmpleosLanding').catch(() => ({ default: () => <LocalizedRouteLoadError translationKey="route_load_error" /> })));
export const ServiciosLanding = React.lazy(() => import('../components/screens/verticals/ServiciosLanding').catch(() => ({ default: () => <LocalizedRouteLoadError translationKey="route_load_error" /> })));
export const CategoryLanding = React.lazy(() => import('../components/screens/verticals/CategoryLanding').catch(() => ({ default: () => <LocalizedRouteLoadError translationKey="route_load_error" /> })));
export const ProductosLanding = React.lazy(() => import('../components/screens/verticals/ProductosLanding').catch(() => ({ default: () => <LocalizedRouteLoadError translationKey="route_load_error" /> })));
export const TurismoLanding = React.lazy(() => import('../components/screens/verticals/TurismoLanding').catch(() => ({ default: () => <LocalizedRouteLoadError translationKey="route_load_error" /> })));
export const ProfileEditScreen = React.lazy(() => import('../components/screens/ProfileEditScreen').catch(() => ({ default: () => <LocalizedRouteLoadError translationKey="route_load_error" /> })));
export const TerminosScreen = React.lazy(() => import('../components/screens/legal/TerminosScreen').catch(() => ({ default: () => <LocalizedRouteLoadError translationKey="route_load_error" /> })));
export const PrivacidadScreen = React.lazy(() => import('../components/screens/legal/PrivacidadScreen').catch(() => ({ default: () => <LocalizedRouteLoadError translationKey="route_load_error" /> })));
export const CookiesScreen = React.lazy(() => import('../components/screens/legal/CookiesScreen').catch(() => ({ default: () => <LocalizedRouteLoadError translationKey="route_load_error" /> })));
export const NotFoundScreen = React.lazy(() => import('../components/screens/NotFoundScreen').catch(() => ({ default: () => <LocalizedRouteLoadError translationKey="route_not_found" /> })));
export const VerificarEmailScreen = React.lazy(() => import('../components/screens/VerificarEmailScreen').catch(() => ({ default: () => <LocalizedRouteLoadError translationKey="route_load_error" /> })));
export const StoresScreen = React.lazy(() => import('../components/screens/StoresScreen').catch(() => ({ default: () => <LocalizedRouteLoadError translationKey="route_load_error" /> })));
export const NotificationsScreen = React.lazy(() => import('../components/screens/NotificationsScreen').catch(() => ({ default: () => <LocalizedRouteLoadError translationKey="notifications_load_error" /> })));
export const ChatScreen = React.lazy(() => import('../components/screens/ChatScreen').catch(() => ({ default: () => <LocalizedRouteLoadError translationKey="route_load_error" /> })));
export const ContactoScreen = React.lazy(() => import('../components/screens/ContactoScreen').catch(() => ({ default: () => <LocalizedRouteLoadError translationKey="route_load_error" /> })));
export const AyudaScreen = React.lazy(() => import('../components/screens/AyudaScreen').catch(() => ({ default: () => <LocalizedRouteLoadError translationKey="route_load_error" /> })));
export const GeoSourcePage = React.lazy(() => import('../components/screens/GeoSourcePage').catch(() => ({ default: () => <LocalizedRouteLoadError translationKey="route_load_error" /> })));
export const ReferralScreen = React.lazy(() => import('../components/screens/ReferralScreen').catch(() => ({ default: () => <LocalizedRouteLoadError translationKey="referral_load_error" /> })));
