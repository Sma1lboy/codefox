import { validate } from 'class-validator';
import { User } from '../user.model';

describe('User Model', () => {
  it('should validate a valid user', async () => {
    // Arrange
    const user = new User();
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
    const user = new User();
    user.username = 'testuser';
    user.email = 'invalid-email';
    user.password = 'password123';

    // Act
    const errors = await validate(user);

    // Assert
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isEmail');
  });
});
