/* eslint-disable  func-names */
/* eslint-disable  no-console */

const Alexa = require('ask-sdk-core');
const AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});
const ddb = new AWS.DynamoDB.DocumentClient();
const wordDefinitions = require("./theWords.json");

const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
  },
  handle(handlerInput) {
    const speechText = 'Welcome to Devlingo Flash Cards: The Web Technology Edition. For instructions, say \"Help\".';
    const reprompt = 'To begin studying, say study \"Flash Cards\".';
    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(reprompt)
      .withSimpleCard("Devlingo Flash Cards", reprompt)
      .getResponse();
  },
};

const AddWordIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AddWordIntent';
  },
  handle(handlerInput) {
    setAskingToDeleteAllCards(handlerInput,false);
    setStudyingFlashcards(handlerInput,false);
    console.log("AddWordIntent: THIS.EVENT = " + JSON.stringify(handlerInput));
    var theWord = sanitize(handlerInput.requestEnvelope.request.intent.slots.Word.value);
    console.log("AddWordIntent: THE WORD = "+theWord);
    var theUser = handlerInput.requestEnvelope.session.user.userId;
    console.log("AddWordIntent: THE USER = "+theUser);
    var theDefinition = wordDefinitions[theWord]
    console.log("AddWordIntent: THE DEFINITION = "+theDefinition);
    args = {theUser: theUser, theWord: theWord, theDefinition: theDefinition};
    if(!theDefinition){
      const speechText = "I can't find the word "+theWord+", if you're having trouble, try spelling it.";
      return handlerInput.responseBuilder
        .speak(speechText)
        .reprompt(speechText)
        .withSimpleCard(capitalizeFirstLetter(theWord), speechText)
        .getResponse();
    }
    //first, get the user's current words.
    return new Promise((resolve, reject) => {
      addWordToUsersFlashcards(args).then((response) => {
        const speechText = response.message;
        resolve(handlerInput.responseBuilder
        .speak(speechText)
        .reprompt(response.reprompt)
        .withSimpleCard(response.header, response.message)
        .getResponse());
      }).catch((errors) =>{
        console.log("AddWordIntent: "+errors);
        const speechText = "Hmm, I seem to be having some difficulty. Please try again later."
        resolve(handlerInput.responseBuilder
          .speak(speechText)
          .withSimpleCard("Error", speechText)
          .getResponse());
      });
    });
  }
}

const RemoveWordIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'RemoveWordIntent';
  },
  handle(handlerInput) {
    setAskingToDeleteAllCards(handlerInput,false);
    setStudyingFlashcards(handlerInput,false);
    console.log("RemoveWordIntent: THIS.EVENT = " + JSON.stringify(handlerInput));
    var theWord = sanitize(handlerInput.requestEnvelope.request.intent.slots.Word.value);
    console.log("RemoveWordIntent: THE WORD = "+theWord);
    var theUser = handlerInput.requestEnvelope.session.user.userId;
    console.log("RemoveWordIntent: THE USER = "+theUser);
    args = {theUser: theUser, theWord: theWord};
    return new Promise((resolve, reject) => {
      removeWordFromUsersFlashcards(args).then((response) => {
        const speechText = response.message;
        resolve(handlerInput.responseBuilder
        .speak(speechText)
        .reprompt(response.reprompt)
        .withSimpleCard(response.header, response.message)
        .getResponse());
      }).catch((errors) =>{
        console.log("RemoveWordIntent: "+errors);
        const speechText = "Hmm, I seem to be having some difficulty. Please try again later."
        resolve(handlerInput.responseBuilder
          .speak(speechText)
          .withSimpleCard("Error", speechText)
          .getResponse());
      });
    });
  }
}

const DeleteAllWordsIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'DeleteAllWordsIntent';
  },
  handle(handlerInput) {
    setStudyingFlashcards(handlerInput,false);
    console.log("DeleteAllWordsIntent: THIS.EVENT = " + JSON.stringify(handlerInput));
    var theUser = handlerInput.requestEnvelope.session.user.userId;
    console.log("DeleteAllWordsIntent: THE USER = "+theUser);
    setAskingToDeleteAllCards(handlerInput,true)
    const speechText = "Are you sure? To confirm, say \"Yes, delete all of my flash cards\"";
    return handlerInput.responseBuilder
    .speak(speechText)
    .reprompt(speechText)
    .withSimpleCard("Are you sure", speechText)
    .getResponse();
  }
}

const ConfirmedDeleteAllWordsIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'ConfirmedDeleteAllWordsIntent';
  },
  handle(handlerInput) {
    setStudyingFlashcards(handlerInput,false);
    console.log("ConfirmedDeleteAllWordsIntent: THIS.EVENT = " + JSON.stringify(handlerInput));
    var theUser = handlerInput.requestEnvelope.session.user.userId;
    console.log("ConfirmedDeleteAllWordsIntent: THE USER = "+theUser);
    args = {theUser: theUser};
    if(!getSessionData(handlerInput) && !getSessionData(handlerInput).askingToDeleteAllCards){
      const speechText = "To delete all of your flash cards, first say something like \"Delete all of my flash cards\"";
      const reprompt = "To begin studying, say \"Study Flash Cards\" any time.";
      return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(reprompt)
      .withSimpleCard("hmm", speechText)
      .getResponse();
    }else{
      return new Promise((resolve, reject) => {
        deleteAllFlashcards(args).then((response) => {
          setAskingToDeleteAllCards(handlerInput,false);
          const speechText = response.message;
          resolve(handlerInput.responseBuilder
          .speak(speechText)
          .reprompt(response.reprompt)
          .withSimpleCard(response.header, response.message)
          .getResponse());
        }).catch((errors) =>{
          console.log("ConfirmedDeleteAllWordsIntent: "+errors);
          const speechText = "Hmm, I seem to be having some difficulty. Please try again later."
          resolve(handlerInput.responseBuilder
            .speak(speechText)
            .withSimpleCard("Error", speechText)
            .getResponse());
        });
      });
    }
  }
}

const ListWordsIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'ListWordsIntent';
  },
  handle(handlerInput) {
    setAskingToDeleteAllCards(handlerInput,false);
    setStudyingFlashcards(handlerInput,false);
    console.log("ListWordsIntent: THIS.EVENT = " + JSON.stringify(handlerInput));
    var theUser = handlerInput.requestEnvelope.session.user.userId;
    console.log("ListWordsIntent: THE USER = "+theUser);
    args = {theUser: theUser};
    return new Promise((resolve, reject) => {
      listUsersWords(args).then((response) => {
        const speechText = response.message;
        resolve(handlerInput.responseBuilder
        .speak(speechText)
        .reprompt(response.reprompt)
        .withSimpleCard(response.header, response.message)
        .getResponse());
      }).catch((errors) =>{
        console.log("ListWordsIntent: "+errors);
        const speechText = "Hmm, I seem to be having some difficulty. Please try again later."
        resolve(handlerInput.responseBuilder
          .speak(speechText)
          .withSimpleCard("Error", speechText)
          .getResponse());
      });
    });
  }
}

const StudyFlashcardsIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'StudyFlashcardsIntent';
  },
  handle(handlerInput) {
    console.log("StudyFlashcardsIntent: Study Flash Cards");
    setStudyingFlashcards(handlerInput,true);
    console.log("StudyFlashcardsIntent: set study flash cards attribute to true");
    setAskingToDeleteAllCards(handlerInput,false);
    console.log("StudyFlashcardsIntent: set asking to delete cards to false");
    console.log("StudyFlashcardsIntent: THIS.EVENT = " + JSON.stringify(handlerInput));
    var theUser = handlerInput.requestEnvelope.session.user.userId;
    console.log("StudyFlashcardsIntent: THE USER = "+theUser);
    args = {theUser: theUser};
    return new Promise((resolve, reject) => {
      startStudying(args).then((response) => {
        var usersWords = response.usersWords;
        var totalGamesCompleted = getTotalGames(handlerInput);
        console.log("StudyFlashcardsIntent: totalGamesCompleted: "+totalGamesCompleted);
        if(usersWords.length != 0){
          console.log("StudyFlashcardsIntent: Setting Current Study Words");
          setCurrentStudyWords(handlerInput,shuffle(usersWords));
          console.log("StudyFlashcardsIntent: Getting first word");
          console.log(handlerInput.attributesManager.getSessionAttributes());
          var firstWord = getNextStudyWord(handlerInput);
          console.log("StudyFlashcardsIntent: first word: "+firstWord);
          var header = firstWord;
          speechText = "Let's get started. ";
          if(totalGamesCompleted == 0){
            speechText += "If you remember the definition, just say \"Got It\", otherwise, say \"I don't know.\" ";
          } 
          speechText += "Your first word is: "+firstWord;
          var reprompt = "The word is: "+firstWord;
          console.log("StudyFlashcardsIntent: speechText: "+speechText);
        }else{
          var header = "No Flashcards";
          var speechText = "You currently have no flash cards. To add a word, such as Polyfill, to your flash cards, just say \"Add Polyfill to my flash cards\"";
          var reprompt = speechText;
        }
        console.log("StudyFlashcardsIntent: speechText: "+speechText);
        resolve(handlerInput.responseBuilder
        .speak(speechText)
        .reprompt(reprompt)
        .withSimpleCard(header, speechText)
        .getResponse());
      }).catch((errors) =>{
        console.log("StudyFlashcardsIntent: "+errors);
        const speechText = "Hmm, I seem to be having some difficulty. Please try again later."
        resolve(handlerInput.responseBuilder
          .speak(speechText)
          .withSimpleCard("Error", speechText)
          .getResponse());
      });
    });
  }
}

const GotItIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'GotItIntent';
  },
  handle(handlerInput) {
    setAskingToDeleteAllCards(handlerInput,false);
    console.log("GotItIntent: THIS.EVENT = " + JSON.stringify(handlerInput));
    var theUser = handlerInput.requestEnvelope.session.user.userId;
    console.log("GotItIntent: THE USER = "+theUser);
    args = {theUser: theUser};
    if(!getSessionData(handlerInput) && !getSessionData(handlerInput).studyingFlashcards){
      const speechText = "To begin studying, say \"Study Flash Cards\" any time.";
      const reprompt = speechText
      return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(reprompt)
      .withSimpleCard("hmm", speechText)
      .getResponse();
    }else{
      console.log("GotItIntent: incrementin total correct.");
      incrementTotalCorrect(handlerInput);
      var header = "Got It";
      console.log("GotItIntent: Checking if next word exists.");
      if(nextStudyWord = getNextStudyWord(handlerInput)){
        console.log("GotItIntent: no new words");
        var speechText = happyAdjective(handlerInput) + ", the next word is: "+nextStudyWord;
        var reprompt = "the next word is: "+nextStudyWord;
      }else{
        console.log("GotItIntent: setting score");
        var score = getScore(handlerInput);
        console.log("GotItIntent: getting end response.");
        var endResponse = endGameResponse(handlerInput,score);
        console.log("GotItIntent: setting speech text.");
        var speechText = happyAdjective(handlerInput) + ", you've completed your flash cards. You scored: "+score+" percent. "+endResponse;
        console.log("GotItIntent: setting reprompt");
        var reprompt = "To study again, say \"Study Flash Cards\" any time.";
        finishGame(handlerInput);
      }
      return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(reprompt)
      .withSimpleCard(header, speechText)
      .getResponse();
    }
  }
}

const DontKnowIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'DontKnowIntent';
  },
  handle(handlerInput) {
    setAskingToDeleteAllCards(handlerInput,false);
    console.log("DontKnowIntentHandler");
    console.log("DontKnowIntent: THIS.EVENT = " + JSON.stringify(handlerInput));
    var theUser = handlerInput.requestEnvelope.session.user.userId;
    console.log("DontKnowIntent: THE USER = "+theUser);
    args = {theUser: theUser};
    if(!getSessionData(handlerInput) && !getSessionData(handlerInput).studyingFlashcards){
      var speechText = "To begin studying, say \"Study Flash Cards\" any time.";
      var reprompt = speechText
      return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(reprompt)
      .withSimpleCard("hmm", speechText)
      .getResponse();
    }else{
      var header = "I don't know";
      var currentWord = getCurrentStudyWord(handlerInput);
      console.log("DontKnowIntent: I don't know the current word: "+currentWord);
      var theDefinition = wordDefinitions[currentWord];
      console.log("DontKnowIntent: the definition: "+theDefinition);
      var speechText = deferenceWord(handlerInput)+", the word "+currentWord+" is usually defined as: "+theDefinition;
      console.log("DontKnowIntent: the speechText: "+speechText);
      if(nextStudyWord = getNextStudyWord(handlerInput)){
        speechText += ". The next word is: "+nextStudyWord;
        var reprompt = "the next word is: "+nextStudyWord;
      }else{
        var score = getScore(handlerInput);
        var endResponse = endGameResponse(handlerInput, score);
        speechText += ". You've completed your flash cards. You scored: "+score+" percent. "+endResponse;
        var reprompt = "To study again, say \"Study Flash Cards\" any time.";
        finishGame(handlerInput);
      }
      return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(reprompt)
      .withSimpleCard(header, speechText)
      .getResponse();
    }
  }
}

const RepeatIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'RepeatIntent';
  },
  handle(handlerInput) {
    setAskingToDeleteAllCards(handlerInput,false);
    console.log("RepeatIntent: THIS.EVENT = " + JSON.stringify(handlerInput));
    var theUser = handlerInput.requestEnvelope.session.user.userId;
    console.log("RepeatIntent: THE USER = "+theUser);
    args = {theUser: theUser};
    if(!getSessionData(handlerInput) && !getSessionData(handlerInput).studyingFlashcards){
      var speechText = "To begin studying, say \"Study Flash Cards\" any time.";
      var reprompt = speechText
      return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(reprompt)
      .withSimpleCard("hmm", speechText)
      .getResponse();
    }else{
      console.log("RepeatIntent: Getting current study word.");
      var currentWord = getCurrentStudyWord(handlerInput);
      console.log("RepeatIntent: currentWord "+currentWord);
      var header = "Repeating "+currentWord;
      console.log("RepeatIntent: header "+header);
      var theDefinition = wordDefinitions[currentWord];
      console.log("RepeatIntent: theDefinition"+theDefinition);
      var speechText =  deferenceWord(handlerInput)+", the word is "+currentWord+".";
      console.log("RepeatIntent: speechText "+speechText);
      var reprompt = "To continue say \"Got It\" or \"I don't know\".";
      console.log("RepeatIntent "+reprompt);
      return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(reprompt)
      .withSimpleCard(header, speechText)
      .getResponse();
    }
  }
}

const HelpIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    setAskingToDeleteAllCards(handlerInput,false);
    console.log("HelpIntent: THIS.EVENT = " + JSON.stringify(handlerInput));
    const speechText = deferenceWord(handlerInput) + ', To add a word such as promise to your flash cards, you can say "add the word promise to my flash cards" or just "add promise". To remove the word, just say, "remove the word promise from my flash cards" or just "remove promise". To begin studying your flash cards, just say "study flash cards". When you know a word just say "Got It", then we\'ll move on to the next word. Otherwise, say "I don\'t know" or "I don\'t remember" and we\'ll review the definition and then move on. If you need a word repeated, say \"Repeat\".';
    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(speechText)
      .withSimpleCard('Devlingo Flash Cards Help', speechText)
      .getResponse();
  },
};

const StopIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent';
  },
  handle(handlerInput) {
    setAskingToDeleteAllCards(handlerInput,false);
    const speechText = 'Thank you for using Devlingo Flash Cards.';

    return handlerInput.responseBuilder
      .speak(speechText)
      .withSimpleCard('Goodbye', speechText)
      .getResponse();
  },
};

const CancelIntentHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'IntentRequest'
      && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent';
  },
  handle(handlerInput) {
    setAskingToDeleteAllCards(handlerInput,false);
    const speechText = 'Okay, what would you like to do next?';
    const reprompt = "To begin studying, say \"Study Flash Cards\" any time."
    return handlerInput.responseBuilder
      .speak(speechText)
      .reprompt(reprompt)
      .withSimpleCard('Okay', speechText)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);

    return handlerInput.responseBuilder.getResponse();
  },
};

const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`Error handled: ${error.message}`);

    return handlerInput.responseBuilder
      .speak('Hmm, I seem to be having some difficulty. Please try again later.')
      .getResponse();
  },
};

function addWordToUsersFlashcards(args){
  var theUser = args.theUser;
  var theWord = args.theWord;
  var theDefinition = args.theDefinition;
  return new Promise((resolve, reject) =>{
    var params = {
      "ConsistentRead": true,
      "Key": { 
        "User": theUser
      },
      "ReturnConsumedCapacity": "NONE",
      "TableName": "devLingoTable2"
    };
    ddb.get(params).promise().then(data =>{
      var usersWords = getUsersWords(data)
      console.log("FUNCTION "+arguments.callee.name+": USERS WORDS = "+usersWords);
      //then, check if the user's word already exists.
      if(usersWords.indexOf(theWord) != -1){
        console.log("FUNCTION "+arguments.callee.name+":  THE WORD EXISTS, sending speech response.");
        response = "The word "+theWord+" is already in your flash cards.";
        reprompt = "To hear a list of your current words, say \"List my words\" any time."
        resolve({header: "Word Exists", message: response, reprompt: reprompt});
      }else{
        //if the word doesn't exist, add it to the user's flash cards.
        usersWords.push(theWord);
        var params = {
          TableName: 'devLingoTable2',
          Item: {
            'User' : theUser,
            'Words' : usersWords.join(","),
          }
        };
        ddb.put(params).promise().then(data =>{
          console.log("FUNCTION "+arguments.callee.name+": PutSuccess", data);
          response = "Okay, "+theWord+", usually defined as "+theDefinition+", has been added to your flash cards";
          reprompt = "To begin studying, say \"Study Flash Cards\" any time.";
          resolve({header: capitalizeFirstLetter(theWord)+" Added", message: response, reprompt: reprompt});
        }).catch(err =>{
          console.log("FUNCTION "+arguments.callee.name+": put Catch Error", err);
        });
      }
    }).catch(err =>{
      console.log("FUNCTION "+arguments.callee.name+": an error: "+err);
    });
  });
}

function removeWordFromUsersFlashcards(args){
  var theUser = args.theUser;
  var theWord = args.theWord;
  return new Promise((resolve, reject) =>{
    //first get the users current words.
    var params = {
      "ConsistentRead": true,
      "Key": { 
        "User": theUser
      },
      "ReturnConsumedCapacity": "NONE",
      "TableName": "devLingoTable2"
    };
    ddb.get(params).promise().then(data =>{
      var usersWords = getUsersWords(data)
      console.log("FUNCTION "+arguments.callee.name+": USERS WORDS = "+usersWords);
      //then, check if the requested word actually exists. If not, let the user know.
      if(usersWords.indexOf(theWord) == -1){
        console.log("FUNCTION "+arguments.callee.name+": THE WORD EXISTS, sending speech response.");
        response = "The word "+theWord+", isn't in your flash cards.";
        reprompt = "To hear a list of your current words, say \"List my words\" any time."
        resolve({header: "Word not Found", message: response, reprompt: reprompt});
      }else{
        //if the word does exist, remove it and let the user know.
        usersWords = usersWords.filter(function(word){
          return word != theWord
        });
        if(usersWords.length == 0){
          usersWords = " ";
        }else{
          usersWords = usersWords.join(",");
        }
        var params = {
          TableName: 'devLingoTable2',
          Item: {
            'User' : theUser,
            'Words' : usersWords,
          }
        };
        ddb.put(params).promise().then(data =>{
          console.log("FUNCTION "+arguments.callee.name+": PutSuccess", data);
          response = "The word "+theWord+", has been removed from your flash cards.";
          if(usersWords != " "){
            reprompt = "To begin studying, say \"Study Flash Cards\" any time.";
          }else{
            reprompt = "You currently have no flash cards. You can add a flashcard any time by saying, for example \"add scrumptious to my flash cards\"";
          }
          resolve({header: capitalizeFirstLetter(theWord)+" Removed", message: response, reprompt: reprompt});
        }).catch(err =>{
          console.log("FUNCTION "+arguments.callee.name+": put Catch Error", err);
        });
      }
    }).catch(err =>{
      console.log("FUNCTION "+arguments.callee.name+": an error: "+err);
    });
  });
}

function deleteAllFlashcards(args){
  var theUser = args.theUser;
  return new Promise((resolve, reject) =>{
    //first get the users current words.
    var params = {
      "ConsistentRead": true,
      "Key": {
        "User": theUser
      },
      "ReturnConsumedCapacity": "NONE",
      "TableName": "devLingoTable2"
    };
    ddb.get(params).promise().then(data =>{
      var usersWords = getUsersWords(data)
      console.log("FUNCTION "+arguments.callee.name+": USERS WORDS = "+usersWords);
      //check if they have words.
      if(usersWords.length == 0){
        console.log("FUNCTION "+arguments.callee.name+": No words exist to remove.");
        response = "Your flash cards are currently empty. To add a new word, such as webkit, to your flash cards just say \"Add webkit to my flash cards\"";
        reprompt = "If you need help, say \"Help\" any time for instructions."
        resolve({header: "No words found.", message: response, reprompt: reprompt});
      }else{
        //if they do have words - remove them.
        usersWords = " ";
        var params = {
          TableName: 'devLingoTable2',
          Item: {
            'User' : theUser,
            'Words' : usersWords
          }
        };
        ddb.put(params).promise().then(data =>{
          console.log("FUNCTION "+arguments.callee.name+": PutSuccess", data);
          response = "No problem, all of your flash cards have been deleted.";
          reprompt = "To add a new word, such as WebSockets, to your flash cards just say \"Add WebSockets to my flash cards\"";
          resolve({header: "All Words Removed", message: response, reprompt: reprompt});
        }).catch(err =>{
          console.log("FUNCTION "+arguments.callee.name+": put Catch Error", err);
        });
      }
    }).catch(err =>{
      console.log("FUNCTION "+arguments.callee.name+": an error: "+err);
    });
  });
}

function listUsersWords(args){
  theUser = args.theUser;
  return new Promise((resolve, reject) =>{
    //first get the users current words.
    var params = {
      "ConsistentRead": true,
      "Key": { 
        "User": theUser
      },
      "ReturnConsumedCapacity": "NONE",
      "TableName": "devLingoTable2"
    };
    ddb.get(params).promise().then(data =>{
      console.log("FUNCTION "+arguments.callee.name+": DB Get Response", data);
      var usersWords = getUsersWords(data);
      console.log("FUNCTION "+arguments.callee.name+": USERS WORDS = "+usersWords);
      reprompt = "To begin studying your flash cards, say \"Study Flash Cards\" any time.";
      if(usersWords.length == 0){
        response = "You currently have no flash cards. To add a word, such as SVG, to your flash cards, just say \"Add SVG to my flash cards\"";
        reprompt = response;
      }else if(usersWords.length==1){
        response = "You currently have one flashcard, it is "+usersWords[0]
      }else{
        usersWords.splice(usersWords.length-1, 0, "and");
        response = "You currently have "+(usersWords.length-1)+" flash cards, they are: "+usersWords.join(", ");
      }
      resolve({header: "Your Flash Cards", message: response, reprompt: reprompt});
    }).catch(err =>{
      console.log("FUNCTION "+arguments.callee.name+": an error: "+err);
    });
  });
}

function startStudying(args){
  theUser = args.theUser;
  console.log("FUNCTION "+arguments.callee.name+": "+theUser);
  return new Promise((resolve, reject) =>{
    //first get the users current words.
    var params = {
      "ConsistentRead": true,
      "Key": { 
        "User": theUser
      },
      "ReturnConsumedCapacity": "NONE",
      "TableName": "devLingoTable2"
    };
    ddb.get(params).promise().then(data =>{
      console.log("FUNCTION "+arguments.callee.name+": DB Get Response", data);
      var usersWords = getUsersWords(data);
      console.log("FUNCTION "+arguments.callee.name+": USERS WORDS = "+usersWords);
      resolve({usersWords: usersWords});
    }).catch(err =>{
      console.log("FUNCTION "+arguments.callee.name+": an error: "+err);
    });
  });
}

function getUsersWords(data){
  if(data.Item){
    return data.Item.Words.split(",").filter(function(word){
      return word.trim() != "";
    });
  }else{
    return [];
  }
}

function getSessionData(handlerInput){
  return handlerInput.attributesManager.getSessionAttributes();
}

function setAskingToDeleteAllCards(handlerInput,value){
  const attributesManager = handlerInput.attributesManager;
  const sessionAttributes = attributesManager.getSessionAttributes();  
  sessionAttributes.askingToDeleteAllCards = value;
  attributesManager.setSessionAttributes(sessionAttributes);
}

function setStudyingFlashcards(handlerInput,value){
  const attributesManager = handlerInput.attributesManager;
  const sessionAttributes = attributesManager.getSessionAttributes();  
  sessionAttributes.studyingFlashcards = value;
  attributesManager.setSessionAttributes(sessionAttributes);
}

function incrementTotalCorrect(handlerInput){
  var correct = getSessionData(handlerInput).totalCorrect || 0;
  correct++;
  const attributesManager = handlerInput.attributesManager;
  const sessionAttributes = attributesManager.getSessionAttributes();  
  sessionAttributes.totalCorrect = correct;
  attributesManager.setSessionAttributes(sessionAttributes); 
}

function getScore(handlerInput){
  console.log("FUNCTION "+arguments.callee.name+": getting score");
  var correct = getSessionData(handlerInput).totalCorrect || 0;
  console.log("FUNCTION "+arguments.callee.name+": correct: "+correct);
  var total = getCurrentStudyWords(handlerInput).length;
  console.log("FUNCTION "+arguments.callee.name+": total: "+total);
  var score = Math.round((correct/total)*100);
  console.log("FUNCTION "+arguments.callee.name+": score: "+score);
  setLastGameScore(handlerInput,score);
  return score;
}

function setLastGameScore(handlerInput,value){
  const attributesManager = handlerInput.attributesManager;
  const sessionAttributes = attributesManager.getSessionAttributes();  
  sessionAttributes.lastGameScore = value;
  attributesManager.setSessionAttributes(sessionAttributes);  
}
function getLastGameScore(handlerInput){
  return getSessionData(handlerInput).lastGameScore;
}

function endGameResponse(handlerInput, score){
  if(score<70){
    return unhappyAdjective(handlerInput)+", I'm sure you can do better. Say study flash cards to try again.";
  }else if(score > 70 && score < 80){
    return neutralAdjective(handlerInput)+", say study flash cards to try again.";
  }else{
    return happyAdjective(handlerInput)+". To study again, say study \"flash cards\" any time.";
  }
}
function finishGame(handlerInput){
  const attributesManager = handlerInput.attributesManager;
  const sessionAttributes = attributesManager.getSessionAttributes();  
  sessionAttributes.totalCorrect = 0;
  sessionAttributes.currentStudyWordsIndex = 0;
  totalGames = getSessionData(handlerInput).totalGames || 0;
  totalGames++;
  sessionAttributes.totalGames = totalGames;
  attributesManager.setSessionAttributes(sessionAttributes);
}
function getTotalGames(handlerInput){
  return getSessionData(handlerInput).totalGames || 0;
}

function happyAdjective(handlerInput){
  //don't repeat.
  console.log("FUNCTION "+arguments.callee.name+": get last happy adjective");
  lastAdjective = getLastHappyAdjective(handlerInput);
  var adj = ["Sweet","Awesome Sauce", "Wicked","Great","Awesome","Wonderful","Impressive","Nice","Excellent","Marvelous","Magnificent","Superb","Outstanding","Good Job", "Spectacular"]
  adj = adj.filter(function(a){
    return a!=lastAdjective;
  });
  a = adj[Math.floor(Math.random()*adj.length)];
  console.log("FUNCTION "+arguments.callee.name+": set last happy adjective");
  setLastHappyAdjective(handlerInput,a);
  return a;
}
function setLastHappyAdjective(handlerInput,adj){
  const attributesManager = handlerInput.attributesManager;
  const sessionAttributes = attributesManager.getSessionAttributes();  
  sessionAttributes.lastHappyAdjective = adj;
  attributesManager.setSessionAttributes(sessionAttributes);  
}
function getLastHappyAdjective(handlerInput){
  return getSessionData(handlerInput).lastHappyAdjective
}

function unhappyAdjective(handlerInput){
  //don't repeat.
  lastAdjective = getLastUnhappyAdjective(handlerInput);
  var adj = ["Yikes","Bummer","Ouch","Oh no","Woops","Eek"];
  adj = adj.filter(function(a){
    return a!=lastAdjective;
  });
  a = adj[Math.floor(Math.random()*adj.length)];
  setLastUnhappyAdjective(handlerInput,a);
  return a;
}
function setLastUnhappyAdjective(handlerInput,adj){
  const attributesManager = handlerInput.attributesManager;
  const sessionAttributes = attributesManager.getSessionAttributes();  
  sessionAttributes.lastUnhappyAdjective = adj;
  attributesManager.setSessionAttributes(sessionAttributes);  
}
function getLastUnhappyAdjective(handlerInput){
  return getSessionData(handlerInput).lastUnhappyAdjective
}

function neutralAdjective(handlerInput){
  //don't repeat.
  lastAdjective = getLastNeutralAdjective(handlerInput);
  var adj = ["Not Bad","Okay","Satisfactory","All right", "Competent performance"];
  adj = adj.filter(function(a){
    return a!=lastAdjective;
  });
  a = adj[Math.floor(Math.random()*adj.length)];
  setLastNeutralAdjective(handlerInput,a);
  return a;
}
function setLastNeutralAdjective(handlerInput,adj){
  const attributesManager = handlerInput.attributesManager;
  const sessionAttributes = attributesManager.getSessionAttributes();  
  sessionAttributes.lastNeutralAdjective = adj;
  attributesManager.setSessionAttributes(sessionAttributes);  
}
function getLastNeutralAdjective(handlerInput){
  return getSessionData(handlerInput).lastNeutralAdjective
}

function deferenceWord(handlerInput){
  //don't repeat.
  lastAdjective = getLastDeferenceWord(handlerInput);
  var adj = ["Okay", "No problem", "All right", "Very well", "Fair enough", "I can help with that"];
  adj = adj.filter(function(a){
    return a!=lastAdjective;
  });
  a = adj[Math.floor(Math.random()*adj.length)];
  setLastDeferenceWord(handlerInput,a);
  return a;
}
function setLastDeferenceWord(handlerInput,adj){
  const attributesManager = handlerInput.attributesManager;
  const sessionAttributes = attributesManager.getSessionAttributes();  
  sessionAttributes.lastDeferenceWord = adj;
  attributesManager.setSessionAttributes(sessionAttributes);  
}
function getLastDeferenceWord(handlerInput){
  return getSessionData(handlerInput).lastDeferenceWord
}

function setCurrentStudyWords(handlerInput,wordsArray){
  console.log("FUNCTION "+arguments.callee.name+": setCurrentStudyWords");
  console.log("FUNCTION "+arguments.callee.name+": "+wordsArray);
  const attributesManager = handlerInput.attributesManager;
  const sessionAttributes = attributesManager.getSessionAttributes();  
  sessionAttributes.currentStudyWords = wordsArray;
  attributesManager.setSessionAttributes(sessionAttributes);  
}
function setCurrentStudyWord(handlerInput,word){
  const attributesManager = handlerInput.attributesManager;
  const sessionAttributes = attributesManager.getSessionAttributes();  
  sessionAttributes.currentStudyWord = word;
  attributesManager.setSessionAttributes(sessionAttributes);  
}
function getCurrentStudyWords(handlerInput){
  console.log("FUNCTION "+arguments.callee.name+": getCurrentStudyWords");
  console.log("FUNCTION "+arguments.callee.name+": "+ JSON.stringify(handlerInput));
  return getSessionData(handlerInput).currentStudyWords;
}
function getCurrentStudyWord(handlerInput){
  console.log("FUNCTION "+arguments.callee.name+": getCurrentStudyWord");
  console.log("FUNCTION "+arguments.callee.name+": index: "+getCurrentStudyWordsIndex(handlerInput));
  console.log("FUNCTION "+arguments.callee.name+": study words: "+getCurrentStudyWords(handlerInput));
  console.log("FUNCTION "+arguments.callee.name+": "+ JSON.stringify(handlerInput));
  return getSessionData(handlerInput).currentStudyWord;
}
function getNextStudyWord(handlerInput){
  console.log("FUNCTION "+arguments.callee.name+": getNextStudyWord");
  console.log("FUNCTION "+arguments.callee.name+": currentIndex: "+getCurrentStudyWordsIndex(handlerInput));
  if(getCurrentStudyWordsIndex(handlerInput)){
    currentIndex = getCurrentStudyWordsIndex(handlerInput);
    console.log("FUNCTION "+arguments.callee.name+": currentIndex = "+currentIndex);
    var nextWord = getCurrentStudyWords(handlerInput)[currentIndex]; 
    console.log("FUNCTION "+arguments.callee.name+": if true, increment index and get next word");
    incrementCurrentStudyWordsIndex(handlerInput);
  }else{
    console.log("FUNCTION "+arguments.callee.name+": if false, increment index and return the first word.");
    var nextWord = getCurrentStudyWords(handlerInput)[0];
    incrementCurrentStudyWordsIndex(handlerInput);
  }
  setCurrentStudyWord(handlerInput, nextWord);
  return nextWord;
}

function incrementCurrentStudyWordsIndex(handlerInput){
  console.log("FUNCTION "+arguments.callee.name+": get current index.");
  var currentIndex = getSessionData(handlerInput).currentStudyWordsIndex || 0;
  console.log("FUNCTION "+arguments.callee.name+": incrementing index");
  currentIndex++;
  const attributesManager = handlerInput.attributesManager;
  const sessionAttributes = attributesManager.getSessionAttributes();  
  sessionAttributes.currentStudyWordsIndex = currentIndex;
  attributesManager.setSessionAttributes(sessionAttributes);   
  return currentIndex;
}

function getCurrentStudyWordsIndex(handlerInput){
  return getSessionData(handlerInput).currentStudyWordsIndex;
}

function sanitize(theWord){
  return theWord.toLowerCase().replace("from flash cards","")
    .replace("from my flash cards","")
    .replace("into my flash cards","")
    .replace("to my flash cards","")
    .replace("from the flash cards","")
    .replace("into the flash cards","")
    .replace("to the flash cards","")
    .replace("the word","")
    .replace(".","").trim();
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;
  while (0 !== currentIndex) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }
  return array;
}

const skillBuilder = Alexa.SkillBuilders.custom();

exports.handler = skillBuilder
  .addRequestHandlers(
    LaunchRequestHandler,
    AddWordIntentHandler,
    RemoveWordIntentHandler,
    ListWordsIntentHandler,
    DeleteAllWordsIntentHandler,
    ConfirmedDeleteAllWordsIntentHandler,
    StudyFlashcardsIntentHandler,
    GotItIntentHandler,
    DontKnowIntentHandler,
    RepeatIntentHandler,
    HelpIntentHandler,
    CancelIntentHandler,
    StopIntentHandler,
    SessionEndedRequestHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();


