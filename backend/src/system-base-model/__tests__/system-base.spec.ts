import { Column, DataSource, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { SystemBaseModel } from '../system-base.model';
import { Field, ID, ObjectType } from '@nestjs/graphql';

@Entity()
@ObjectType()
class TestEntity extends SystemBaseModel {
  @PrimaryGeneratedColumn()
  @Field(() => ID)
  id: string;

  @Column()
  @Field()
  name: string;
}

describe('SystemBaseModel', () => {
  let dataSource: DataSource;

  beforeEach(async () => {
    // Setup test database
    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      entities: [TestEntity],
      synchronize: true,
      dropSchema: true,
    });
    await dataSource.initialize();
  });

  afterEach(async () => {
    await dataSource.destroy();
  });

  describe('Timestamps', () => {
    it('should set created_at and updated_at on creation', async () => {
      // Arrange
      const repository = dataSource.getRepository(TestEntity);
      const entity = new TestEntity();
      entity.name = 'Test Entity';

      // Act
      const savedEntity = await repository.save(entity);

      // Assert
      expect(savedEntity.created_at).toBeDefined();
      expect(savedEntity.updated_at).toBeDefined();
      expect(savedEntity.created_at instanceof Date).toBeTruthy();
      expect(savedEntity.updated_at instanceof Date).toBeTruthy();
    });

    it('should update updated_at on entity update', async () => {
      // Arrange
      const repository = dataSource.getRepository(TestEntity);
      const entity = new TestEntity();
      entity.name = 'Test Entity';

      const savedEntity = await repository.save(entity);
      const originalUpdatedAt = savedEntity.updated_at;

      // Wait a bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Act
      savedEntity.name = 'Updated Name';
      const updatedEntity = await repository.save(savedEntity);

      // Assert
      expect(updatedEntity.updated_at.getTime()).toBeGreaterThanOrEqual(
        originalUpdatedAt.getTime(),
      );
      expect(updatedEntity.created_at.getTime()).toBe(
        savedEntity.created_at.getTime(),
      );
    });

    it('should preserve created_at on entity update', async () => {
      // Arrange
      const repository = dataSource.getRepository(TestEntity);
      const entity = new TestEntity();
      entity.name = 'Test Entity';

      // Act
      const savedEntity = await repository.save(entity);
      const originalCreatedAt = savedEntity.created_at;

      savedEntity.name = 'Updated Name';
      const updatedEntity = await repository.save(savedEntity);

      // Assert
      expect(updatedEntity.created_at.getTime()).toBe(
        originalCreatedAt.getTime(),
      );
    });
  });

  describe('Default Values', () => {
    it('should set default values on creation', async () => {
      // Arrange
      const repository = dataSource.getRepository(TestEntity);
      const entity = new TestEntity();
      entity.name = 'Test Entity';

      // Act
      const savedEntity = await repository.save(entity);

      // Assert
      expect(savedEntity.is_active).toBe(true);
      expect(savedEntity.is_deleted).toBe(false);
    });

    it('should allow overriding default is_active value', async () => {
      // Arrange
      const repository = dataSource.getRepository(TestEntity);
      const entity = new TestEntity();
      entity.name = 'Test Entity';
      entity.is_active = false;

      // Act
      const savedEntity = await repository.save(entity);

      // Assert
      expect(savedEntity.is_active).toBe(false);
    });

    it('should allow overriding default is_deleted value', async () => {
      // Arrange
      const repository = dataSource.getRepository(TestEntity);
      const entity = new TestEntity();
      entity.name = 'Test Entity';
      entity.is_deleted = true;

      // Act
      const savedEntity = await repository.save(entity);

      // Assert
      expect(savedEntity.is_deleted).toBe(true);
    });
  });

  describe('Status Flags', () => {
    it('should handle soft delete by updating is_deleted flag', async () => {
      // Arrange
      const repository = dataSource.getRepository(TestEntity);
      const entity = new TestEntity();
      entity.name = 'Test Entity';

      const savedEntity = await repository.save(entity);
      expect(savedEntity.is_deleted).toBe(false);

      // Act
      savedEntity.is_deleted = true;
      const deletedEntity = await repository.save(savedEntity);

      // Assert
      expect(deletedEntity.is_deleted).toBe(true);
      expect(deletedEntity.updated_at.getTime()).toBeGreaterThanOrEqual(
        savedEntity.updated_at.getTime(),
      );
    });

    it('should handle deactivation by updating is_active flag', async () => {
      // Arrange
      const repository = dataSource.getRepository(TestEntity);
      const entity = new TestEntity();
      entity.name = 'Test Entity';

      const savedEntity = await repository.save(entity);
      expect(savedEntity.is_active).toBe(true);

      // Act
      savedEntity.is_active = false;
      const deactivatedEntity = await repository.save(savedEntity);

      // Assert
      expect(deactivatedEntity.is_active).toBe(false);
      expect(deactivatedEntity.updated_at.getTime()).toBeGreaterThanOrEqual(
        savedEntity.updated_at.getTime(),
      );
    });
  });

  describe('Query Behavior', () => {
    it('should be able to query by is_active status', async () => {
      // Arrange
      const repository = dataSource.getRepository(TestEntity);

      // Create active and inactive entities
      await repository.save([
        { name: 'Active Entity', is_active: true },
        { name: 'Inactive Entity', is_active: false },
      ]);

      // Act
      const activeEntities = await repository.find({
        where: { is_active: true },
      });
      const inactiveEntities = await repository.find({
        where: { is_active: false },
      });

      // Assert
      expect(activeEntities.length).toBe(1);
      expect(inactiveEntities.length).toBe(1);
      expect(activeEntities[0].name).toBe('Active Entity');
      expect(inactiveEntities[0].name).toBe('Inactive Entity');
    });

    it('should be able to query by is_deleted status', async () => {
      // Arrange
      const repository = dataSource.getRepository(TestEntity);

      // Create deleted and non-deleted entities
      await repository.save([
        { name: 'Active Entity', is_deleted: false },
        { name: 'Deleted Entity', is_deleted: true },
      ]);

      // Act
      const nonDeletedEntities = await repository.find({
        where: { is_deleted: false },
      });
      const deletedEntities = await repository.find({
        where: { is_deleted: true },
      });

      // Assert
      expect(nonDeletedEntities.length).toBe(1);
      expect(deletedEntities.length).toBe(1);
      expect(nonDeletedEntities[0].name).toBe('Active Entity');
      expect(deletedEntities[0].name).toBe('Deleted Entity');
    });
  });
});
