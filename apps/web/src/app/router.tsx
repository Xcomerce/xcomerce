import { createBrowserRouter, Navigate } from 'react-router-dom'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { AuthLayout } from '@/components/layout/AuthLayout'
import {
  GuestRoute,
  ProtectedRoute,
  RoleRoute,
  SelectRoleRoute,
  SupplierApprovedRoute,
} from '@/components/auth/route-guards'
import {
  ActiveRoleAppLayout,
  AdminAppLayout,
  BuyerAppLayout,
  SupplierAppLayout,
} from '@/components/layout/role-layouts'
import { LandingPage, ParaCompradoresPage, ParaFornecedoresPage, PricingPage } from '@/pages/landing/LandingPages'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { SelectRolePage } from '@/pages/auth/SelectRolePage'
import {
  adminPages,
  buyerPages,
  sharedPages,
  supplierPages,
} from '@/pages/placeholders'

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'para-compradores', element: <ParaCompradoresPage /> },
      { path: 'para-fornecedores', element: <ParaFornecedoresPage /> },
      { path: 'pricing', element: <PricingPage /> },
    ],
  },
  {
    element: <AuthLayout />,
    children: [{ path: 'auth/reset-password', element: <ResetPasswordPage /> }],
  },
  {
    element: <GuestRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: 'auth/login', element: <LoginPage /> },
          { path: 'auth/register/buyer', element: <RegisterPage role="buyer" /> },
          { path: 'auth/register/supplier', element: <RegisterPage role="supplier" /> },
          { path: 'auth/forgot-password', element: <ForgotPasswordPage /> },
        ],
      },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <SelectRoleRoute />,
        children: [{ path: 'auth/select-role', element: <SelectRolePage /> }],
      },
      {
        element: <ActiveRoleAppLayout />,
        children: [
          { path: 'settings/profile', element: sharedPages.profile },
          { path: 'settings/billing', element: sharedPages.billing },
          { path: 'notifications', element: sharedPages.notifications },
          { path: 'profile/:userId', element: sharedPages.publicProfile },
        ],
      },
      {
        element: <RoleRoute role="buyer" />,
        children: [
          {
            element: <BuyerAppLayout />,
            children: [
              { path: 'buyer/dashboard', element: buyerPages.dashboard },
              { path: 'buyer/demands/new', element: buyerPages.newDemand },
              { path: 'buyer/demands/:id', element: buyerPages.demandDetail },
              { path: 'buyer/orders', element: buyerPages.orders },
              { path: 'buyer/orders/:id', element: buyerPages.orderDetail },
            ],
          },
        ],
      },
      {
        element: <RoleRoute role="supplier" />,
        children: [
          {
            element: <SupplierAppLayout />,
            children: [
              { path: 'supplier/onboarding', element: supplierPages.onboarding },
              { path: 'supplier/catalog', element: supplierPages.catalog },
              { path: 'supplier/catalog/new', element: supplierPages.catalogNew },
              { path: 'supplier/catalog/:id/edit', element: supplierPages.catalogEdit },
              { path: 'supplier/orders', element: supplierPages.orders },
              { path: 'supplier/orders/:id', element: supplierPages.orderDetail },
            ],
          },
          {
            element: <SupplierApprovedRoute />,
            children: [
              {
                element: <SupplierAppLayout />,
                children: [
                  { path: 'supplier/board', element: supplierPages.board },
                  { path: 'supplier/offers/:demandId', element: supplierPages.offerDetail },
                ],
              },
            ],
          },
        ],
      },
      {
        element: <RoleRoute role="admin" alsoAllow={['commercial']} />,
        children: [
          {
            element: <AdminAppLayout />,
            children: [
              { path: 'admin/approvals', element: adminPages.approvals },
              { path: 'admin/metrics', element: adminPages.metrics },
              { path: 'admin/categories', element: adminPages.categories },
              { path: 'admin/audit', element: adminPages.audit },
            ],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
