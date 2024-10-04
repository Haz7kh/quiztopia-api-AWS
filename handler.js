const AWS = require("aws-sdk");
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const CognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();

// Using environment variable for Cognito Client ID
const clientId = process.env.COGNITO_CLIENT_ID;

// Create a Quiz
module.exports.createQuiz = async (event) => {
  const body = JSON.parse(event.body);
  const quizId = Date.now().toString();
  const params = {
    TableName: "Quizzes",
    Item: {
      quizId: quizId,
      quizName: body.quizName,
      createdBy: body.createdBy,
      questions: [],
    },
  };

  try {
    await dynamoDB.put(params).promise();
    return {
      statusCode: 201,
      body: JSON.stringify({
        quizId: quizId,
        message: "Quiz created successfully!",
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to create quiz", error }),
    };
  }
};

// Get All Quizzes
module.exports.getAllQuizzes = async () => {
  const params = {
    TableName: "Quizzes",
  };

  try {
    const result = await dynamoDB.scan(params).promise();
    return {
      statusCode: 200,
      body: JSON.stringify(result.Items),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to fetch quizzes", error }),
    };
  }
};

// Get Questions for a Quiz
module.exports.getQuizQuestions = async (event) => {
  const quizId = event.pathParameters.quizId;
  const params = {
    TableName: "Quizzes",
    Key: {
      quizId: quizId,
    },
  };

  try {
    const result = await dynamoDB.get(params).promise();
    return {
      statusCode: 200,
      body: JSON.stringify(result.Item),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to fetch quiz", error }),
    };
  }
};

// Add a Question to a Quiz
module.exports.addQuestion = async (event) => {
  const quizId = event.pathParameters.quizId;
  const body = JSON.parse(event.body);
  const params = {
    TableName: "Quizzes",
    Key: {
      quizId: quizId,
    },
    UpdateExpression: "SET questions = list_append(questions, :q)",
    ExpressionAttributeValues: {
      ":q": [
        {
          question: body.question,
          answer: body.answer,
          coordinates: body.coordinates,
        },
      ],
    },
    ReturnValues: "UPDATED_NEW",
  };

  try {
    const result = await dynamoDB.update(params).promise();
    return {
      statusCode: 200,
      body: JSON.stringify(result.Attributes),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to add question", error }),
    };
  }
};

// Delete a Quiz
module.exports.deleteQuiz = async (event) => {
  const quizId = event.pathParameters.quizId;
  const params = {
    TableName: "Quizzes",
    Key: {
      quizId: quizId,
    },
  };

  try {
    await dynamoDB.delete(params).promise();
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Quiz deleted successfully" }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to delete quiz", error }),
    };
  }
};

// Register a User
module.exports.registerUser = async (event) => {
  const body = JSON.parse(event.body);
  const params = {
    ClientId: clientId,
    Username: body.email,
    Password: body.password,
    UserAttributes: [
      {
        Name: "email",
        Value: body.email,
      },
    ],
  };

  try {
    const result = await CognitoIdentityServiceProvider.signUp(
      params
    ).promise();
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "User registered successfully", result }),
    };
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "User registration failed", error }),
    };
  }
};

// Login a User
module.exports.loginUser = async (event) => {
  const body = JSON.parse(event.body);
  const params = {
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: clientId,
    AuthParameters: {
      USERNAME: body.email,
      PASSWORD: body.password,
    },
  };

  try {
    const result = await CognitoIdentityServiceProvider.initiateAuth(
      params
    ).promise();
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Login successful",
        idToken: result.AuthenticationResult.IdToken,
        accessToken: result.AuthenticationResult.AccessToken,
        refreshToken: result.AuthenticationResult.RefreshToken,
      }),
    };
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        message: "Login failed",
        error: error.message || JSON.stringify(error),
      }),
    };
  }
};
