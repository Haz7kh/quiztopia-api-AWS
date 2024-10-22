const AWS = require("aws-sdk");
const middy = require("@middy/core");
const jsonBodyParser = require("@middy/http-json-body-parser");
const httpErrorHandler = require("@middy/http-error-handler");
const createError = require("http-errors");

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const CognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();
const clientId = process.env.COGNITO_CLIENT_ID;

// Create a Quiz
const createQuiz = async (event) => {
  const body = event.body;
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

  await dynamoDB.put(params).promise();

  return {
    statusCode: 201,
    body: JSON.stringify({
      quizId: quizId,
      message: "Quiz created successfully!",
    }),
  };
};

module.exports.createQuiz = middy(createQuiz)
  .use(jsonBodyParser())
  .use(httpErrorHandler());

// Get All Quizzes
const getAllQuizzes = async () => {
  const params = {
    TableName: "Quizzes",
  };

  const result = await dynamoDB.scan(params).promise();

  return {
    statusCode: 200,
    body: JSON.stringify(result.Items),
  };
};

module.exports.getAllQuizzes = middy(getAllQuizzes).use(httpErrorHandler());

// Get Questions for a Quiz
const getQuizQuestions = async (event) => {
  const quizId = event.pathParameters.quizId;

  const params = {
    TableName: "Quizzes",
    Key: {
      quizId: quizId,
    },
  };

  const result = await dynamoDB.get(params).promise();

  if (!result.Item) {
    throw new createError.NotFound(`Quiz with ID ${quizId} not found`);
  }

  return {
    statusCode: 200,
    body: JSON.stringify(result.Item),
  };
};

module.exports.getQuizQuestions = middy(getQuizQuestions).use(
  httpErrorHandler()
);

// Add a Question to a Quiz
const addQuestion = async (event) => {
  const quizId = event.pathParameters.quizId;
  const body = event.body;

  const params = {
    TableName: "Quizzes",
    Key: { quizId: quizId },
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

  const result = await dynamoDB.update(params).promise();

  return {
    statusCode: 200,
    body: JSON.stringify(result.Attributes),
  };
};

module.exports.addQuestion = middy(addQuestion)
  .use(jsonBodyParser())
  .use(httpErrorHandler());

// Delete a Quiz
const deleteQuiz = async (event) => {
  const quizId = event.pathParameters.quizId;

  const params = {
    TableName: "Quizzes",
    Key: {
      quizId: quizId,
    },
  };

  await dynamoDB.delete(params).promise();

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Quiz deleted successfully" }),
  };
};

module.exports.deleteQuiz = middy(deleteQuiz).use(httpErrorHandler());

// Register a User
const registerUser = async (event) => {
  const body = event.body;

  const params = {
    ClientId: clientId,
    Username: body.email,
    Password: body.password,
    UserAttributes: [{ Name: "email", Value: body.email }],
  };

  const result = await CognitoIdentityServiceProvider.signUp(params).promise();

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "User registered successfully", result }),
  };
};

module.exports.registerUser = middy(registerUser)
  .use(jsonBodyParser())
  .use(httpErrorHandler());

// Login a User
const loginUser = async (event) => {
  const body = event.body;

  const params = {
    AuthFlow: "USER_PASSWORD_AUTH",
    ClientId: clientId,
    AuthParameters: {
      USERNAME: body.email,
      PASSWORD: body.password,
    },
  };

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
};

module.exports.loginUser = middy(loginUser)
  .use(jsonBodyParser())
  .use(httpErrorHandler());
