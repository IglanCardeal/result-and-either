# Result e Either

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
const userFound = await this.userRepository.findUserByEmail(email);
if (!userFound) {
  return Result.fail(`User not found with email: ${email}`);
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
  return Result.fail(`User not found with email: ${email}`, 'unauthorized');
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
