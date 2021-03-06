'use strict';

var should      = require('should')
  , Buddycloud = require('../../index')
  , helper      = require('../helper')

/* jshint -W030 */
describe('Buddycloud', function() {

    var buddycloud, socket, xmpp, manager

    before(function() {
        socket = new helper.SocketEventer()
        xmpp = new helper.XmppEventer()
        manager = {
            socket: socket,
            client: xmpp,
            trackId: function(id, callback) {
                if (typeof id !== 'object')
                    throw new Error('Stanza protection ID not added')
                this.callback = callback
            },
            makeCallback: function(error, data) {
                this.callback(error, data)
            },
            jid: 'juliet@example.net',
            _getLogger: function() {
                return {
                    log: function() {},
                    info: function() {},
                    error: function() {},
                    warn: function() {}
                }
            }
        }
        buddycloud = new Buddycloud()
        buddycloud.init(manager)
    })

    beforeEach(function() {
        socket.removeAllListeners()
        xmpp.removeAllListeners()
        buddycloud.init(manager)
        buddycloud.channelServer = 'channels.example.com'
    })

    describe('Subscription', function() {

        it('Errors when no callback provided', function(done) {
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            socket.once('xmpp.error.client', function(error) {
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal('Missing callback')
                error.request.should.eql({})
                xmpp.removeAllListeners('stanza')
                done()
            })
            socket.send('xmpp.buddycloud.subscription', {})
        })

        it('Errors when non-function callback provided', function(done) {
            xmpp.once('stanza', function() {
                done('Unexpected outgoing stanza')
            })
            socket.once('xmpp.error.client', function(error) {
                error.type.should.equal('modify')
                error.condition.should.equal('client-error')
                error.description.should.equal('Missing callback')
                error.request.should.eql({})
                xmpp.removeAllListeners('stanza')
                done()
            })
            socket.send('xmpp.buddycloud.subscription', {}, true)
        })

        it('Complains if discovery hasn\'t taken place', function(done) {
            delete buddycloud.channelServer
            socket.send('xmpp.buddycloud.subscription', {}, function(error, data) {
                should.not.exist(data)
                error.should.eql({
                    type: 'modify',
                    condition: 'client-error',
                    description: 'You must perform discovery first!',
                    request: {}
                })
                done()
            })
        })

        it('Sends expected stanza', function(done) {
            var request = {
                node: '/user/twelfth@night.org/posts',
                jid: 'juliet@shakespeare.lit',
                subscription: 'subscribed'
            }
            xmpp.once('stanza', function(stanza) {
                stanza.is('iq').should.be.true
                stanza.attrs.to.should.equal(buddycloud.channelServer)
                stanza.attrs.type.should.equal('set')
                stanza.attrs.id.should.exist
                stanza.getChild('pubsub', buddycloud.NS_OWNER).should.exist
                var subscriptions = stanza.getChild('pubsub')
                    .getChild('subscriptions')
                subscriptions.should.exist
                subscriptions.attrs.node.should.equal(request.node)

                var subscription = subscriptions.getChild('subscription')
                subscription.attrs.jid.should.equal(request.jid)
                subscription.attrs.subscription
                    .should.equal(request.subscription)

                done()
            })
            socket.send('xmpp.buddycloud.subscription', request, function() {})
        })

        it('Handles an error stanza response', function(done) {
            xmpp.once('stanza', function() {
                manager.makeCallback(helper.getStanza('iq-error'))
            })
            var callback = function(error, success) {
                should.not.exist(success)
                error.should.eql({
                    type: 'cancel',
                    condition: 'error-condition'
                })
                done()
            }
            var request = {
                node: '/user/twelfth@night.org/posts',
                jid: 'juliet@shakespeare.lit',
                subscription: 'subscribed'
            }
            socket.send(
                'xmpp.buddycloud.subscription',
                request,
                callback
            )
        })

        it('Handles basic success response', function(done) {
            xmpp.once('stanza', function() {
                manager.makeCallback(helper.getStanza('subscribe-basic'))
            })
            var callback = function(error, success) {
                should.not.exist(error)
                success.should.be.true
                done()
            }
            var request = {
                node: '/user/twelfth@night.org/posts',
                jid: 'juliet@shakespeare.lit',
                subscription: 'subscribed'
            }
            socket.send(
                'xmpp.buddycloud.subscription',
                request,
                callback
            )
        })

    })
    
    describe('Invitations', function() {
        
        it('Sends expected invitation', function(done) {
            var request = {
                node: '/user/twelfth@night.org/posts',
                jid: 'juliet@shakespeare.lit',
                subscription: 'invited'
            }
            xmpp.once('stanza', function(stanza) {
                stanza.is('iq').should.be.true
                stanza.attrs.to.should.equal(buddycloud.channelServer)
                stanza.attrs.type.should.equal('set')
                stanza.attrs.id.should.exist
                stanza.getChild('pubsub', buddycloud.NS_OWNER).should.exist
                var subscriptions = stanza.getChild('pubsub')
                    .getChild('subscriptions')
                subscriptions.should.exist
                subscriptions.attrs.node.should.equal(request.node)

                var subscription = subscriptions.getChild('subscription')
                subscription.attrs.jid.should.equal(request.jid)
                subscription.attrs.subscription
                    .should.equal(request.subscription)

                done()
            })
            socket.send('xmpp.buddycloud.subscription', request, function() {})
        })
        
    })

})