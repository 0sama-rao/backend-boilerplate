import path from 'path'
import lumie from 'lumie'
import dotenv from 'dotenv'
import express from 'express'
import bodyParser from 'body-parser'
import * as Sentry from '@sentry/node'

import exceptionHander from './middlewares/exception-handler'
import { createClient } from './config/redis'
import { tmpdir } from 'os'
;(async function() {
    /**
     * load environment variables from .env
     */
    dotenv.config()

    /**
     * initiate the express server instance
     */
    const app = express()

    /**
     * initiate the sentry instance
     */
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
    })

    const tmpDir = tmpdir()
    app.use('/storage', express.static('storage'))
    app.use(`${tmpDir}/consort`, express.static(`${tmpDir}/consort`))

    /**
     * The request handler must be the
     * first middleware on the app
     */
    app.use(Sentry.Handlers.requestHandler())

    /**
     * enable cors for express app
     */
    const cors = require('cors')({
        origin: true,
    })
    app.use(cors)

    /**
     * to recognize the incoming Request Object as strings or arrays
     * for facebook data deletion request callback
     */
    app.use(express.urlencoded({ extended: false }))

    /**
     * parse the from body using body parser
     */
    app.use(
        bodyParser.json({
            limit: '100mb',
        })
    )

    /**
     * Bind routes with express app
     */
    lumie.load(app, {
        preURL: 'api',
        verbose: true,
        ignore: ['*.spec', '*.action', '*.md'],
        controllers_path: path.join(__dirname, 'controllers'),
    })

    /**
     * connect to the redis wait for the connection then proceed
     */
    await createClient()

    /**
     * The error handler must be before
     * any other error middleware and
     * after all controllers
     */
    app.use(Sentry.Handlers.errorHandler())

    /**
     * Default exception handing
     */
    app.use(exceptionHander)

    /**
     * get express port from .env
     * or declare with default value
     */
    const port = process.env.PORT || 1500

    /**
     * listen to the exposed port
     */
    app.listen(port, () => {
        // eslint-disable-next-line
        console.log('App server started on port: ' + port)
    })
})()
