import { validate } from 'class-validator';
import { RegisterUserInput } from 'src/user/dto/register-user.input';

describe('RegisterUserInput', () => {
  it('should validate valid registration input', async () => {
    // Arrange
    const registerInput = new RegisterUserInput();
    registerInput.username = 'testuser';
    registerInput.email = 'test@example.com';
    registerInput.password = 'password123';

    // Act
    const errors = await validate(registerInput);

    // Assert
    expect(errors.length).toBe(0);
  });

  it('should fail validation with short username', async () => {
    // Arrange
    const registerInput = new RegisterUserInput();
    registerInput.username = 'te'; // Less than 3 characters
    registerInput.email = 'test@example.com';
    registerInput.password = 'password123';

    // Act
    const errors = await validate(registerInput);

    // Assert
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('minLength');
  });

  it('should fail validation with short password', async () => {
    // Arrange
    const registerInput = new RegisterUserInput();
    registerInput.username = 'testuser';
    registerInput.email = 'test@example.com';
    registerInput.password = '12345'; // Less than 6 characters

    // Act
    const errors = await validate(registerInput);

    // Assert
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('minLength');
  });

  it('should fail validation with invalid email', async () => {
    // Arrange
    const registerInput = new RegisterUserInput();
    registerInput.username = 'testuser';
    registerInput.email = 'invalid-email';
    registerInput.password = 'password123';

    // Act
    const errors = await validate(registerInput);

    // Assert
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].constraints).toHaveProperty('isEmail');
  });
});
