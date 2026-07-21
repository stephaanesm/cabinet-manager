/**
 * modules/dossiers/dossiers.controller.spec.ts
 * ---------------------------------------------------------------------------
 */
import { Test, TestingModule } from '@nestjs/testing';
import { DossiersController } from './dossiers.controller';
import { DossiersService } from './dossiers.service';

describe('DossiersController', () => {
  let controller: DossiersController;
  let service: jest.Mocked<DossiersService>;

  const user = { id: 7, cabinetId: 1, role: 'Avocat', permissions: [] };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DossiersController],
      providers: [
        {
          provide: DossiersService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            cloturer: jest.fn(),
            calculerRentabilite: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(DossiersController);
    service = module.get(DossiersService);
  });

  it('create délègue au service avec le DTO et l\'utilisateur courant', async () => {
    const dto = { titre: 'X', clientId: 1 };
    await controller.create(dto as any, user as any);
    expect(service.create).toHaveBeenCalledWith(dto, user);
  });

  it('findAll transmet query, user et la portée résolue par le guard', async () => {
    const query = { page: 1, pageSize: 20 };
    await controller.findAll(query as any, user as any, 'own');
    expect(service.findAll).toHaveBeenCalledWith(query, user, 'own');
  });

  it('findOne convertit bien le paramètre id en nombre (ParseIntPipe)', async () => {
    await controller.findOne(100, user as any, 'own');
    expect(service.findOne).toHaveBeenCalledWith(100, user, 'own');
  });

  it('cloturer délègue au service avec le bon id', async () => {
    await controller.cloturer(100, user as any, 'own');
    expect(service.cloturer).toHaveBeenCalledWith(100, user, 'own');
  });

  it('rentabilite délègue au service avec le bon id', async () => {
    await controller.rentabilite(100, user as any, 'all');
    expect(service.calculerRentabilite).toHaveBeenCalledWith(100, user, 'all');
  });
});
