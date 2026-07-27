import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from './entities/document.entity';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { QueryDocumentsDto } from './dto/query-documents.dto';
import { JournalService } from '../journal/journal.service';
import { AuthenticatedUser } from '../../common/interfaces/jwt-payload.interface';

export interface ResultatPagine<T> {
  page: number; pageSize: number; total: number; data: T[];
}

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private readonly repo: Repository<Document>,
    private readonly journalService: JournalService,
  ) {}

  async create(dto: CreateDocumentDto, user: AuthenticatedUser): Promise<Document> {
    const doc = this.repo.create({
      cabinetId: user.cabinetId,
      dossierId: dto.dossierId ?? null,
      nom: dto.nom,
      typeDocument: dto.typeDocument ?? null,
      cheminFichier: dto.cheminFichier ?? null,
      tailleKo: dto.tailleKo ?? null,
      confidentialite: dto.confidentialite ?? 'public' as any,
      description: dto.description ?? null,
      tags: dto.tags ?? null,
      creePar: user.id,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const saved = await this.repo.save(doc);
    await this.journalService.enregistrer({
      cabinetId: user.cabinetId, utilisateurId: user.id,
      action: 'document.create', entiteType: 'document',
      entiteId: saved.id, donneesApres: { ...saved },
    });
    return saved;
  }

  async findAll(query: QueryDocumentsDto, user: AuthenticatedUser): Promise<ResultatPagine<Document>> {
    const qb = this.repo.createQueryBuilder('d')
      .where('d.cabinetId = :cabinetId', { cabinetId: user.cabinetId })
      .andWhere('d.deletedAt IS NULL');

    if (query.dossierId)       qb.andWhere('d.dossierId = :dossierId', { dossierId: query.dossierId });
    if (query.typeDocument)    qb.andWhere('d.typeDocument ILIKE :type', { type: `%${query.typeDocument}%` });
    if (query.confidentialite) qb.andWhere('d.confidentialite = :conf', { conf: query.confidentialite });
    if (query.search)          qb.andWhere('(d.nom ILIKE :s OR d.description ILIKE :s)', { s: `%${query.search}%` });

    qb.orderBy('d.createdAt', 'DESC')
      .skip((query.page - 1) * query.pageSize)
      .take(query.pageSize);

    const [data, total] = await qb.getManyAndCount();
    return { page: query.page, pageSize: query.pageSize, total, data };
  }

  async findOne(id: number, user: AuthenticatedUser): Promise<Document> {
    const doc = await this.repo.findOne({
      where: { id, cabinetId: user.cabinetId, deletedAt: null as any },
    });
    if (!doc) throw new NotFoundException({ error: { code: 'NOT_FOUND', message: 'Document introuvable.', status: 404 } });
    return doc;
  }

  async update(id: number, dto: UpdateDocumentDto, user: AuthenticatedUser): Promise<Document> {
    const doc = await this.findOne(id, user);
    const avant = { ...doc };
    if (dto.nom             !== undefined) doc.nom             = dto.nom;
    if (dto.typeDocument    !== undefined) doc.typeDocument    = dto.typeDocument;
    if (dto.cheminFichier   !== undefined) doc.cheminFichier   = dto.cheminFichier;
    if (dto.tailleKo        !== undefined) doc.tailleKo        = dto.tailleKo;
    if (dto.confidentialite !== undefined) doc.confidentialite = dto.confidentialite;
    if (dto.description     !== undefined) doc.description     = dto.description;
    if (dto.tags            !== undefined) doc.tags            = dto.tags;
    const saved = await this.repo.save(doc);
    await this.journalService.enregistrer({
      cabinetId: user.cabinetId, utilisateurId: user.id,
      action: 'document.update', entiteType: 'document',
      entiteId: id, donneesAvant: avant, donneesApres: { ...saved },
    });
    return saved;
  }

  async remove(id: number, user: AuthenticatedUser): Promise<void> {
    const doc = await this.findOne(id, user);
    doc.deletedAt = new Date();
    await this.repo.save(doc);
    await this.journalService.enregistrer({
      cabinetId: user.cabinetId, utilisateurId: user.id,
      action: 'document.delete', entiteType: 'document',
      entiteId: id, donneesAvant: { ...doc },
    });
  }
}
