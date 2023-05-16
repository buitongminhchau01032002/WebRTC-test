import React, { useRef } from 'react';

import {
    Button,
    KeyboardAvoidingView,
    SafeAreaView,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';

import {
    RTCPeerConnection,
    RTCIceCandidate,
    RTCSessionDescription,
    RTCView,
    MediaStream,
    mediaDevices,
} from 'react-native-webrtc';
import { useState } from 'react';
import { addDoc, collection, doc, getDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

function RandomId() {
    var min = 0;
    var max = 999999;

    var randomNum = Math.floor(Math.random() * (max - min + 1)) + min;
    var paddedNum = String(randomNum).padStart(6, '0');

    return paddedNum;
}

function App() {
    const [remoteStream, setRemoteStream] = useState(null);
    const [webcamStarted, setWebcamStarted] = useState(false);
    const [localStream, setLocalStream] = useState(null);
    const [channelId, setChannelId] = useState(null);
    const pc = useRef();
    const servers = {
        iceServers: [
            {
                urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
            },
        ],
        iceCandidatePoolSize: 10,
    };

    const startWebcam = async () => {
        pc.current = new RTCPeerConnection(servers);
        const local = await mediaDevices.getUserMedia({
            video: true,
            audio: true,
        });

        setLocalStream(local);
        let remote = new MediaStream();
        setRemoteStream(remote);

        // Check connection state
        pc.current.addEventListener('connectionstatechange', (event) => {
            console.log('🔌 Peer Connection State: ' + pc.current.connectionState);
        });

        // Push tracks from local stream to peer connection
        local.getTracks().forEach((track) => {
            pc.current.addTrack(track, local);
        });

        // Pull tracks from remote stream, add to video stream
        pc.current.ontrack = (event) => {
            remote = remote || new MediaStream();
            remote.addTrack(event.track, remote);
        };

        setWebcamStarted(true);
    };

    const startCall = async () => {
        //create offer
        const offerDescription = await pc.current.createOffer();
        await pc.current.setLocalDescription(offerDescription);
        const id = RandomId();

        const offer = {
            sdp: offerDescription.sdp,
            type: offerDescription.type,
        };
        const offerCandidates = collection(db, 'channels', id, 'offerCandidates');
        const answerCandidates = collection(db, 'channels', id, 'answerCandidates');

        setChannelId(id);

        pc.current.onicecandidate = async (event) => {
            if (event.candidate) {
                await addDoc(offerCandidates, event.candidate.toJSON());
            }
        };
        const channelDoc = doc(db, 'channels', id);
        await setDoc(channelDoc, { offer });

        // Listen for remote answer
        onSnapshot(channelDoc, (snapshot) => {
            const data = snapshot.data();
            if (!pc.current.currentRemoteDescription && data?.answer) {
                const answerDescription = new RTCSessionDescription(data.answer);
                pc.current.setRemoteDescription(answerDescription);
            }
        });

        // When answered, add candidate to peer connection
        onSnapshot(answerCandidates, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    pc.current.addIceCandidate(new RTCIceCandidate(data));
                }
            });
        });
    };

    const joinCall = async () => {
        const channelDoc = doc(db, 'channels', channelId);
        const offerCandidates = collection(db, 'channels', channelId, 'offerCandidates');
        const answerCandidates = collection(db, 'channels', channelId, 'answerCandidates');

        pc.current.onicecandidate = async (event) => {
            if (event.candidate) {
                await addDoc(answerCandidates, event.candidate.toJSON());
            }
        };

        const channelDocument = await getDoc(channelDoc);
        const channelData = channelDocument.data();

        const offerDescription = channelData.offer;

        await pc.current.setRemoteDescription(new RTCSessionDescription(offerDescription));

        const answerDescription = await pc.current.createAnswer();
        await pc.current.setLocalDescription(answerDescription);

        const answer = {
            type: answerDescription.type,
            sdp: answerDescription.sdp,
        };

        await updateDoc(channelDoc, { answer });
        onSnapshot(offerCandidates, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    pc.current.addIceCandidate(new RTCIceCandidate(data));
                }
            });
        });
    };

    return (
        <KeyboardAvoidingView style={styles.body} behavior="position">
            <SafeAreaView>
                {localStream && (
                    <RTCView
                        streamURL={localStream?.toURL()}
                        style={styles.stream}
                        objectFit="cover"
                        mirror
                    />
                )}

                {remoteStream && (
                    <RTCView
                        streamURL={remoteStream?.toURL()}
                        style={styles.stream}
                        objectFit="cover"
                        mirror
                    />
                )}

                <View style={styles.buttons}>
                    {!webcamStarted && <Button title="Start webcam" onPress={startWebcam} />}
                    {webcamStarted && <Button title="Start call" onPress={startCall} />}
                    {webcamStarted && (
                        <View style={{ flexDirection: 'row' }}>
                            <Button title="Join call" onPress={joinCall} />
                            <TextInput
                                value={channelId}
                                placeholder="callId"
                                minLength={45}
                                style={{ borderWidth: 1, padding: 5 }}
                                keyboardType="number-pad"
                                onChangeText={(newText) => setChannelId(newText)}
                            />
                        </View>
                    )}
                </View>
            </SafeAreaView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    body: {
        backgroundColor: '#fff',

        justifyContent: 'center',
        alignItems: 'center',
        ...StyleSheet.absoluteFill,
    },
    stream: {
        flex: 2,
        width: 200,
        height: 200,
    },
    buttons: {
        alignItems: 'flex-start',
        flexDirection: 'column',
    },
});

export default App;
