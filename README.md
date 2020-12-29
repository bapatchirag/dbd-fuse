# dbd-fuse

Mounts a filesystem designed under [Couscous](https://github.com/chrisvrose/couscous-next)

## Usage

```sh
node src https://localhost:8080 ./mnt -o username=foo@foo.bar,password=mypassword

# OR (mount specified)
node src ./mnt

# OR (all environment variables)
npm start


# need npm link first
mount -t fuse.tamarillo http://localhost:8081 ./mnt/ -o user,username=foo@bar.baz,password=password
```

If your password contains a comma(?), it should be passed as an environment variable.

## Environment variables

You can use `.env` by installing `dotenv`, and the project will use them automatically.

*OR*

Set them as required

### List 

|Variable          |DESC             |
|:----------------:|:----------------|
|COUSCOUS_FUSEEMAIL|Email            |
|COUSCOUS_FUSEPWD  |Password         |
|COUSCOUS_DMOUNT   |location to mount|
|COUSCOUS_URL      |url              |
|COUSCOUS_FUSEDEBUG|Enable debug mode|



