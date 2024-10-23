import { validate } from 'class-validator';
import { Menu } from 'src/auth/menu/menu.model';
import { Role } from 'src/auth/role/role.model';
import { User } from 'src/user/user.model';
import { DataSource } from 'typeorm';

describe('User Model', () => {
  let user: User;
  let dataSource: DataSource;

  beforeEach(async () => {
    user = new User();

    // Initialize test database connection
    dataSource = new DataSource({
      type: 'sqlite',
      database: ':memory:',
      entities: [User, Role, Menu],
      synchronize: true,
      dropSchema: true,
    });
    await dataSource.initialize();
  });

  afterEach(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  describe('Basic Validation', () => {
    it('should validate a valid user', async () => {
      // Arrange
      user.username = 'testuser';
      user.email = 'test@example.com';
      user.password = 'password123';

      // Act
      const errors = await validate(user);

      // Assert
      expect(errors.length).toBe(0);
    });

    it('should fail validation with invalid email', async () => {
      // Arrange
      user.username = 'testuser';
      user.email = 'invalid-email';
      user.password = 'password123';

      // Act
      const errors = await validate(user);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].constraints).toHaveProperty('isEmail');
    });

    it('should fail validation with empty email', async () => {
      // Arrange
      user.username = 'testuser';
      user.email = '';
      user.password = 'password123';

      // Act
      const errors = await validate(user);

      // Assert
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('Database Constraints', () => {
    it('should enforce unique username constraint', async () => {
      // Arrange
      const userRepo = dataSource.getRepository(User);

      const user1 = new User();
      user1.username = 'testuser';
      user1.email = 'test1@example.com';
      user1.password = 'password123';

      const user2 = new User();
      user2.username = 'testuser'; // Same username
      user2.email = 'test2@example.com';
      user2.password = 'password123';

      // Act & Assert
      await userRepo.save(user1);
      await expect(userRepo.save(user2)).rejects.toThrow();
    });

    it('should enforce unique email constraint', async () => {
      // Arrange
      const userRepo = dataSource.getRepository(User);

      const user1 = new User();
      user1.username = 'user1';
      user1.email = 'test@example.com';
      user1.password = 'password123';

      const user2 = new User();
      user2.username = 'user2';
      user2.email = 'test@example.com'; // Same email
      user2.password = 'password123';

      // Act & Assert
      await userRepo.save(user1);
      await expect(userRepo.save(user2)).rejects.toThrow();
    });
  });

  describe('Role Relationship', () => {
    it('should allow adding roles to user', async () => {
      // Arrange
      const userRepo = dataSource.getRepository(User);
      const roleRepo = dataSource.getRepository(Role);

      // Create test role
      const role = new Role();
      role.name = 'TEST_ROLE';
      await roleRepo.save(role);

      // Create user with role
      user.username = 'testuser';
      user.email = 'test@example.com';
      user.password = 'password123';
      user.roles = [role];

      // Act
      const savedUser = await userRepo.save(user);
      const foundUser = await userRepo.findOne({
        where: { id: savedUser.id },
        relations: ['roles'],
      });

      // Assert
      expect(foundUser.roles).toBeDefined();
      expect(foundUser.roles.length).toBe(1);
      expect(foundUser.roles[0].name).toBe('TEST_ROLE');
    });

    it('should allow multiple roles for a user', async () => {
      // Arrange
      const userRepo = dataSource.getRepository(User);
      const roleRepo = dataSource.getRepository(Role);

      // Create test roles
      const role1 = new Role();
      role1.name = 'ROLE_1';
      await roleRepo.save(role1);

      const role2 = new Role();
      role2.name = 'ROLE_2';
      await roleRepo.save(role2);

      // Create user with multiple roles
      user.username = 'testuser';
      user.email = 'test@example.com';
      user.password = 'password123';
      user.roles = [role1, role2];

      // Act
      const savedUser = await userRepo.save(user);
      const foundUser = await userRepo.findOne({
        where: { id: savedUser.id },
        relations: ['roles'],
      });

      // Assert
      expect(foundUser.roles).toBeDefined();
      expect(foundUser.roles.length).toBe(2);
      expect(foundUser.roles.map((r) => r.name)).toContain('ROLE_1');
      expect(foundUser.roles.map((r) => r.name)).toContain('ROLE_2');
    });
  });

  describe('SystemBaseModel Integration', () => {
    it('should have created_at and updated_at fields', async () => {
      // Arrange
      const userRepo = dataSource.getRepository(User);
      user.username = 'testuser';
      user.email = 'test@example.com';
      user.password = 'password123';

      // Act
      const savedUser = await userRepo.save(user);

      // Assert
      expect(savedUser.created_at).toBeDefined();
      expect(savedUser.updated_at).toBeDefined();
      expect(savedUser.created_at instanceof Date).toBeTruthy();
      expect(savedUser.updated_at instanceof Date).toBeTruthy();
    });

    it('should update updated_at on user modification', async () => {
      // Arrange
      const userRepo = dataSource.getRepository(User);
      user.username = 'testuser';
      user.email = 'test@example.com';
      user.password = 'password123';

      // Act
      const savedUser = await userRepo.save(user);
      const originalUpdatedAt = savedUser.updated_at;

      // Wait a bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 100));

      savedUser.username = 'newusername';
      const updatedUser = await userRepo.save(savedUser);

      // Assert
      expect(updatedUser.updated_at.getTime()).toBeGreaterThanOrEqual(
        originalUpdatedAt.getTime(),
      );
    });
  });

  describe('Data Type Validation', () => {
    it('should generate UUID for id field', async () => {
      // Arrange
      const userRepo = dataSource.getRepository(User);
      user.username = 'testuser';
      user.email = 'test@example.com';
      user.password = 'password123';

      // Act
      const savedUser = await userRepo.save(user);

      // Assert
      expect(savedUser.id).toBeDefined();
    });
  });
});
