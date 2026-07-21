/**
 * modules/auth/auth.controller.spec.ts
 * ---------------------------------------------------------------------------
 * Le contrôleur étant volontairement "mince" (aucune logique), ces tests se
 * contentent de vérifier que chaque route appelle la bonne méthode du service
 * avec les bons arguments, et gère correctement l'en-tête X-Device-Id.
 * ---------------------------------------------------------------------------
 */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let service: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            login: jest.fn(),
            verifierDeuxFacteurs: jest.fn(),
            rafraichirJetons: jest.fn(),
            logout: jest.fn(),
            demarrerActivationDeuxFacteurs: jest.fn(),
            confirmerActivationDeuxFacteurs: jest.fn(),
            desactiverDeuxFacteurs: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(AuthController);
    service = module.get(AuthService);
  });

  it("login transmet le deviceId issu de l'en-tête X-Device-Id", async () => {
    service.login.mockResolvedValue({ requiresTwoFactor: false } as any);
    await controller.login({ email: 'a@x.cm', motDePasse: 'x' }, 'mon-telephone-android');
    expect(service.login).toHaveBeenCalledWith({ email: 'a@x.cm', motDePasse: 'x' }, 'mon-telephone-android');
  });

  it('login retombe sur "unknown-device" si aucun en-tête X-Device-Id fourni', async () => {
    service.login.mockResolvedValue({ requiresTwoFactor: false } as any);
    await controller.login({ email: 'a@x.cm', motDePasse: 'x' }, undefined as any);
    expect(service.login).toHaveBeenCalledWith(expect.anything(), 'unknown-device');
  });

  it('verifierDeuxFacteurs délègue directement au service', async () => {
    const dto = { preAuthToken: 't', code: '123456' };
    await controller.verifierDeuxFacteurs(dto);
    expect(service.verifierDeuxFacteurs).toHaveBeenCalledWith(dto);
  });

  it('rafraichir transmet le refreshToken et le deviceId', async () => {
    await controller.rafraichir({ refreshToken: 'RT' }, 'device-x');
    expect(service.rafraichirJetons).toHaveBeenCalledWith('RT', 'device-x');
  });

  it('logout appelle authService.logout avec le refreshToken', async () => {
    await controller.logout({ refreshToken: 'RT' });
    expect(service.logout).toHaveBeenCalledWith('RT');
  });

  it("monProfil retourne directement l'utilisateur courant (déjà résolu par le guard JWT)", async () => {
    const user = { id: 1, cabinetId: 1, role: 'Avocat', permissions: [] };
    const resultat = await controller.monProfil(user as any);
    expect(resultat).toBe(user);
  });
});
