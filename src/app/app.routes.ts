import { Routes } from '@angular/router';
import { RegisterComponent } from './pages/register/register';
import { LoginComponent } from './pages/login/login';
import { BookListComponent } from './pages/book-list/book-list';
import { ProfileComponent } from './pages/profile/profile';
import { BookDetailComponent } from './pages/book-detail/book-detail';
import { MyBooksComponent } from './pages/my-books/my-books';
import { AddBookComponent } from './pages/add-book/add-book';
import { authGuard } from './core/guards/auth-guard';
import { ChatListComponent } from './pages/chat-list/chat-list';
import { ChatConversationComponent } from './pages/chat-conversation/chat-conversation';
import { EditBookComponent } from './pages/edit-book/edit-book';
import { EditProfileComponent } from './pages/edit-profile/edit-profile';
import { ReceivedProposalsComponent } from './pages/received-proposals/received-proposals';
import { HomeComponent } from './pages/home/home';
import { ExchangeHistoryComponent } from './pages/exchange-history/exchange-history';
import { ProposalDetailComponent } from './pages/proposal-detail/proposal-detail';

import { ChangePasswordComponent } from './pages/change-password/change-password';

import { MeetingPointsComponent } from './pages/meeting-points/meeting-points';
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password';
import { ResetPasswordComponent } from './pages/reset-password/reset-password';

import { AboutUsComponent } from './pages/about-us/about-us';
import { adminGuard } from './core/guards/admin-guard';
import { AdminDashboardComponent } from './pages/admin-dashboard/admin-dashboard';
import { ProposalsSentComponent } from './pages/proposals-sent/proposals-sent';
import { AdminUserListComponent } from './pages/admin-user-list/admin-user-list';
import { AdminBookListComponent } from './pages/admin-book-list/admin-book-list';
import { PublicProfileComponent } from './pages/public-profile/public-profile';

export const routes: Routes = [
  { path: '', component: HomeComponent }, 
  { path: 'catalogo', component: BookListComponent },
  { path: 'registro', component: RegisterComponent },
  { path: 'login', component: LoginComponent },
  { path: 'perfil', component: ProfileComponent, canActivate: [authGuard] },
  { 
    path: 'perfil/editar', 
    component: EditProfileComponent, 
    canActivate: [authGuard] 
  },
  { 
    path: 'perfil/cambiar-password', 
    component: ChangePasswordComponent, 
    canActivate: [authGuard] 
  },
  { 
    path: 'usuario/:id', // La URL dinámica (ej: /usuario/5)
    component: PublicProfileComponent,
    canActivate: [authGuard] // (O quítalo si quieres que los perfiles sean 100% públicos)
  },


  {
    path: 'admin',
    canActivate: [adminGuard], // 👈 El "guard" protege TODAS las rutas hijas
    children: [
      {
        path: '', // La ruta /admin (vacía)
        component: AdminDashboardComponent 
      },
      {
        path: 'users', // La ruta /admin/users
        component: AdminUserListComponent
      },
      {
        path: 'books', // La ruta /admin/books
        component: AdminBookListComponent
      }
    ]
  },

  { path: 'sobre-nosotros', component: AboutUsComponent },

  { path: 'terminos', component: AboutUsComponent },
  { path: 'privacidad', component: AboutUsComponent },

  { path: 'puntos-encuentro', component: MeetingPointsComponent },

  {
    path: 'historial', // URL para ver el historial
    component: ExchangeHistoryComponent,
    canActivate: [authGuard]
  },
  
  {
    path: 'libros/nuevo',
    component: AddBookComponent,
    canActivate: [authGuard]
  },
  { // La ruta de edición va ANTES de la de detalle
    path: 'libros/:id/editar', 
    component: EditBookComponent, 
    canActivate: [authGuard] 
  },
  { // La ruta de detalle va DESPUÉS
    path: 'libros/:id',
    component: BookDetailComponent
  },
  
  {
    path: 'mis-libros',
    component: MyBooksComponent,
    canActivate: [authGuard]
  },
  {
    path: 'chat', // Página principal del chat (lista de conversaciones)
    component: ChatListComponent,
    canActivate: [authGuard]
  },
  {
    path: 'chat/:id', // Página para ver una conversación específica (por ID)
    component: ChatConversationComponent,
    canActivate: [authGuard]
  },
  {
    path: 'propuestas/recibidas', // 👈 RUTA CAMBIADA
    component: ReceivedProposalsComponent,
    canActivate: [authGuard]
  },
  {
    path: 'propuestas/enviadas', // 👈 RUTA NUEVA
    component: ProposalsSentComponent,
    canActivate: [authGuard]
  },

 { path: 'propuestas/:id', component: ProposalDetailComponent, canActivate: [authGuard] },

  { path: 'recuperar-password', component: ForgotPasswordComponent },
  { path: 'reset-password/:token', component: ResetPasswordComponent },
];