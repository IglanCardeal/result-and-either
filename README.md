# Result e Either

## Disclaimer

O que eu apresento aqui não é nada inventado por mim, apenas resultados de muitas pesquisas relacionadas em **como melhorar meus códigos e projetos**. Da mesma forma que em um momento nos meus estudos e práticas eu me senti extremamente incomodado e desconfortável com a arquitetura MVC que é a arquitetura padrão usada na maioria dos cursos de Node.js de nível iniciante (ou até mesmo nos que se dizem "avançados" ou "masters"). Nada contra essa arquitetura, mas eu senti que para dar o próximo passo, eu não poderia continuar fazendo a mesma coisa, então passei a estudar sobre outros assuntos que me ajudassem a _olhar por cima do muro_, como _Design Pattern_, arquitetura em camadas, _Clean Architecture_ e principalmente os princípios [**SOLID**](https://en.wikipedia.org/wiki/SOLID).

Em certo momento, descobri o didático e excelente canal do professor Otavio Lemos no [YouTube](https://www.youtube.com/channel/UC9cOiXh-RFR7KI61KcyTb0g) e , posteriormente, descobri o seu o vídeo
[108 - Tratamento Flexível de Erros em TypeScript + Node.js | Princípio da Menor Surpresa](https://www.youtube.com/watch?v=ai-gumm3Ois) que me fez finalmente achar um ponto de partida para melhorar meus códigos. Como referência, o professor Lemos mencionou o excelente blog do [Khalil Stemmler](https://khalilstemmler.com/), que me apresentou o livro o seu livro _SOLID The Software Design and Architecture Handbook_. Dentre os destaques deste blog/livro e do canal do professor, foi a classe `Result` e a monada `Either`, que foram tópicos que me despertou muita curiosidade e são estes tópicos que eu quero falar sobre e compartilhar com vocês. Do meu jeito, é claro, com base no que eu entendi e apliquei/aplico nos meus projetos. Parte dos códigos foram adaptados por mim de acordo com a minha necessidade, mas acho que vale como referência para vocês.

Todos os créditos e agradecimentos ao professor Otavio Lemos e ao Khalil Stemmler por compartilharem conhecimento. Não deixem de acompanhar e seguir o canal e o blog mencionados.

---

## Result

Durante muito tempo, em projetos de cursos e projetos pessoais, lançar exceções e deixá-las para tratar em outro escopo de código foi e maneira que achei ser a padronizada e a melhor forma de se fazer.

Foi muito comum eu ver e escrever códigos semelhantes a esse abaixo:

```js
...
class DomainUserError extends Error {
  constructor(msg) {
    super();
    this.name = 'UserError';
    this.message = msg;
  }
}
...
...
// em alguma classe de casos de uso...
const userFound = await this.userRepository.findUserByEmail(email)
if (!userFound) {
  throw new DomainUserError(`User not found with email: ${email}`)
}
...
```

E em algum controlador/camada mais externa do projeto, tratar esse error com alguma verificação de instância do error, para ai sim responder de acordo com a "semântica" (tipo) do erro, como por exemplo:

```js
try {
  // o caso de uso lança um erro
  await useCaseThrowsDomainUserError();
} catch (e) {
  if (e instanceof UserError) {
    console.log('User Error');
    // faz X coisa para esse "tipo" de erro
    return ...
  }
  // ou faz Y coisa para outros "tipos"
  console.log('Not User Error');
}
```

Coloquei **"semântica"** pois os erros em JS/TS não são (pelo menos no momento quee escrevo esse README) _type-safe_, ou seja, o tipo de um erro é, por padrão, indefinido e nem adianta tentar tipá-lo. Isso dificulda entender a semântica do erro, ou seja, quem o gerou e com base nisso tomar as medidas necessárias de adordo e para se sobrepor a essa limitação eu tenho que ficar verificando se um determinado erro é instância de uma certa classe de erro.

E não me entenda mal, o código acima funciona e é relativamente fácil de entender, mas com o tempo eu senti um incômodo e passei a achar que o meu cõdigo não estava **simples** de se entender. Vou destacar os motivos do porque desta minha afirmação:

1. Se eu for lançar uma exceção, tenho que ter a atenção de em algum código que contenha o código que irá lançar a exceção, ou seja a camada mais externa que será o _wrapper_ do código todo, ter um bloco `try/catch` para capturar a exceção.

2. O motivo mencionao no item acima leva a outro problema. Quem for analisar o código, seja eu ou outro dev, vai se deparar com um `throw` e imediatamente pensar: _"Quem trata esse erro?"_. Talvez esse comportamento lembre a instrução `GOTO` que é considerado uma [má prática](https://stackoverflow.com/questions/3517726/what-is-wrong-with-using-goto) por gerar _spaghetti code_. `throws` seria semelhante no caso de interromper o fluxo de execução de um código e levar o fluxo para outro bloco em outra camada.

3. Vocẽ tira a responsabilidade de lidar com erros de quem chamou uma função e passa essa responsabilidade para um código _wrapper_.

4. O código não é explicito sobre o que uma chamada pode resultar ou retornar.

A classe `Result` entra para tentar minimizar estes problemas mencionados acima, mesmo que o JS/TS não ofereçam suporte nativo para implementar de forma semelhante ao Rust. O código de exemplo acima, adaptado para o uso do `Result` ficaria assim:

```js
// caso de uso
const userFound = await this.userRepository.findUserByEmail(email)
if (!userFound) {
  return Result.fail(`User not found with email: ${email}`)
}
```

No controlador, teremos um código mais explicito de que uma chamada a um caso de uso pode retornar um caso de sucesso (`success`) ou caso de falha (`failure`). A classe `Result` **obriga quem chamou** a verificar se houve sucesso ou falha na chamada do caso de uso. Com base nisso, o próprio código que chamou tem a responsabilidade de tomar as decisões em caso de falha ou sucesso:

```js
const userOrFail: Result<any> = await userLoginService.execute(data)
if (userOrFail.isFailure) {
  // trata os erros em caso de falha
  console.log('User Error: ', userOfFail.error);
  ...
}
// em caso de sucesso, segue o fluxo
...
```

Dependendo do tipo de erro de `User`, posso tomar decisões diferentes:

```js
if (!userNotFound) {
  return Result.fail(`User not found with email: ${email}`, 'unauthorized')
}
```

Adaptando:

```js
const userOrFail: Result<any> = await userLoginService.execute(data)
if (userOrFail.isFailure && userOrFail.type === 'unauthorized) {
  // trata os erros em caso de 'unauthorized'
  console.log('User Error: ', userOfFail.error);
  ...
}
if (userOrFail.isFailure) {
  // trata os erros em caso de falha
  console.log('User Error: ', userOfFail.error);
  ...
}
// em caso de sucesso, segue o fluxo
...
```

Obviamente o código acima é apenas um exemplo, mas ele já demonstra como o código ficou mais explicito e claro do que pode acontecer e retornar para uma determinada ação. O próprio código que chamou teve que lidar com os casos de falha, além de termos erros mais "semãnticos" graças ao `type`. Pense por exemplo no caso em que foi definido que qualquer error retornado intencionalmente por uma classe de serviço - que contém as regras de negócio de domínio e da aplicação - vai retornar um objeto de erro do domínio, por exemplo um `DomainUserAuthError`, que retorna caso o usuário não está autorizado para uma executar uma determinada ação. Em um controlador de um servidor HTTP, como o _Express_, eu poderia retornar respostas HTTP de acordo com aquele erro específico de domínio, enviando uma mensagem e um _status code_ de acordo:

```js
const userOrFail: Result<any> = await userLoginService.execute(data)
if (userOrFail.isFailure && userOrFail.type === 'unauthorized) {
  // trata os erros em caso de 'unauthorized'
  console.log('User Error: ', userOfFail.error);
  return res.status(401).send({
    statusCode: 401,
    error: new DomainUserAuthError(userOrFail.error)
  })
}
if (userOrFail.isFailure) {
  console.log('User Error: ', userOfFail.error);
  ...
}
...
```

## Either

Os caminhos felizes e tristes de uma _feature_. Toda feature tem um caminho de sucesso e um ou vários caminho de fracasso. Por exemplo, `CreateUser` é uma funcionalidade que possui diversos caminhos para o fracasso e apenas um para o sucesso.

O que pode dar errado?:

- Erros de regras de domínio

  - Email inválido
  - Email já em uso
  - Senha muito curta/fraca
  - Nome de usuário inválido
  - Nome de usuário já em uso

- Erros de aplicação
  - Conexão com banco de dados instável
  - API para envio de confirmação de email fora do ar
  - Qualquer erro inesperado

O que pode dar certo?:

- Cadastro com sucesso, retornando o `id` de registro feito

Muitas vezes, temos que tratar esses erros de maneira implicita para o cliente que consome a nossa API, como erros de domínio serem mapeados para um (em casos de aplicação web) código HTTP 4xx, erros de aplicação para códigos 5xx e o caso de sucesso para códigos 2xx.

Normalmente, em aplicações Node.js, pode ser familiar encontrar trechos de código como:

```js
// controller
async handle(req: Request, res: Response): Promise<any> {
  try {
    const user = await this.createUserService<any>(req.body)
    return res.status(201).json({userId: user.id})
  } catch (error) {
    if (error instanceof InvalidEmail) {
      return res.status(400).json({message: 'Invalid email'})
    }
    if (error instanceof InvalidPassword) {
      return res.status(400).json({message: 'Invalid password'})
    }
    ...

    return res.status(500).json({message: 'Internal Server Error'})
  }
}

// service
async createUserService(body: any) {
  if (!isValidEmail()) {
    throw new InvalidEmail()
  }
  if (!isValidPassword()) {
    throw new InvalidPassword()
  }
  ...
  return this.userRepo.create(body)
}
```

OK! Isso funciona, você provavelmente vai chegar ao resultado desejado desta forma. Porém, isso leva a alguns pontos como: _O que acontece se tal coisa falhar?_, _Quem trata esse erro?_, _Não era pra ter um `try/catch` por aqui?_, _O que essa chamada pode retornar?_.
Eu já trabalhei em projetos com Express onde, por exemplo, o email de cadastro deveria ser único, mas ao analisar o código de cadastro de usuários, não encontrei nenhuma lógica que validasse isso. Foi a solução procurar o try/catch e advinha só...não achei. Até que na função `next` do Express, tinha um `switch/case` que verificava se o erro atendia um critério bem específico que indicava se o erro do banco de dados era de um problema de email informado ser duplicado. Moral da história: **foi uma surpresa para mim** como aquele erro foi tratado.

Vamos de outro exemplo.

```js
type CreateUserRequest = {
  password: string
  email: string
  username: string
}

// interface para o caso de sucesso
type CreateUserSuccess = {
  readonly id: string
}

// o que pode ser?
type CreateUserResult = {
}

function createUser(request: CreateUserRequest): CreateUserResult {
  ...
}

if (userResult.isSuccess()) {
 ...
}
if (userResult.isFailure()) {
 ...
}
```

O que pode acontecer aqui em cima? O que queremos fazer no tratamento de erro acima, caso ocorra?

Podemos ter tanto (_Either_) casos de fracasso quanto um caso de sucesso e nosso objetivo é dizer explicitamente o que pode ser retornado por `createUser`, tanto pra dizer se fracassou ou ocorreu com sucesso.

### Introduzindo o tipo `Either`

Como ele é:

```js
type Either<S, F> = Success<S, F> | Failure<S, F>
```

Este tipo indica que o mesmo pode possuir 2 valores, graças ao _Union Type_. No caso acima, ele recebe o tipo estrutural da classe `Success` ou `Failure`, ou seja, um valor de sucesso ou fracaso.

Como são as classes:

```js
class Success<S, F> {
  constructor(readonly value: S) {}

  isSuccess(): this is Success<S, F> {
    return true
  }

  isFailure(): this is Failure<S, F> {
    return false
  }
}

class Failure<S, F> {
  constructor(readonly value: F) {}

  isSuccess(): this is Success<S, F> {
    return false
  }

  isFailure(): this is Failure<S, F> {
    return true
  }
}
```

Usamos o recurso de _Generics_ pois precisamos passar para as classes valores de objetos e temos que saber se estes valores são de sucesso ou fracasso. Por isso temos 2 classes, cada uma implementa a mesma interface, mas com comportamentos diferentes.

Factories functions:

```js
const success = <S, F>(data: S): Either<S, F> => {
  return new Success(data)
}

const failure = <S, F>(data: F): Either<S, F> => {
  return new Failure(data)
}
```

Vamos tipar os casos possíveis de retorno e dar um significado semântico para cada um deles:

```js
// interface para o caso de sucesso
type CreateUserSuccess = {
  readonly id: string
}

// algum ero de domínio
type DomainError = {
  message: string
}

// algum erro de aplicação
type ApplicationError = {
  message: string,
  error: any,
}
```

Agora as classes que implementam essas interfaces:

```js
class CreateUser implements CreateUserSuccess {
  constructor(readonly id: string) {}
}

class InvalidEmailError implements DomainError {
  readonly message: string

  constructor(email: string) {
    this.message = `The email ${email} is invalid`
  }
}

class InvalidPasswordError implements DomainError {
  readonly message: string

  constructor(pass: string) {
    this.message = `The password ${pass} is invalid`
  }
}

class UserAlreadyExistError implements DomainError {
  readonly message: string

  constructor(username: string) {
    this.message = `The username ${username} is already taken`
  }
}

class DatabaseError implements ApplicationError {
  readonly message: string

  constructor(readonly error: any) {
    this.message = 'A database error occurred'
    this.error = error
  }
}
```

Repare que até um erro de aplicação (banco de dados) foi convertido em um erro semântico e explicito. Agora `createUser` pode retornar o seguinte:

```js
type CreateUserResult = Either<
  CreateUserSuccess,
  | InvalidEmailError
  | InvalidPasswordError
  | UserAlreadyExistError
  | ApplicationError
>

function createUser(request: CreateUserRequest): CreateUserResult {
  if (!isEmailValid()) {
    return failure(new InvalidEmailError(request.email))
  }

  if (!isPassValid()) {
    return failure(new InvalidPasswordError(request.password))
  }

  if (!isUserValid()) {
    return failure(new UserAlreadyExistError(request.username))
  }

  try {
    const user = db.create(request)
    return success(new CreateUser(user.id))
  } catch (error) {
    return failure(new DatabaseError(error))
  }
}
```

Para o cliente que consome esta função, ficará **explicito** o que a chamada de `createUser` pode retornar, e assim, realizar as devidas tratativas para os mesmos:

```js
const userCreation: CreateUserResult = createUser({
  password: '123',
  email: 'test@email.com',
  username: 'test'
})

if (userCreation.isFailure()) {
  const error = userCreation.value
  switch (error.constructor) {
    case InvalidEmailError:
      ...
      break
    case InvalidPasswordError:
      ...
      break
    case UserAlreadyExistError:
      ...
      break
    case ApplicationError:
      ...
      break
  }
}
if (userCreation.isSuccess()) {
  console.log(userCreation.value.id)
}
```

---

- Referência: [SOLID The Software Design and Architecture Handbook](https://solidbook.io/)
