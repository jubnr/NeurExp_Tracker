// lib/screens/study_detail_screen.dart
import 'package:flutter/material.dart';
import 'package:neurexp_tracker/models/study.dart';
import 'package:neurexp_tracker/models/participant.dart';
import 'package:neurexp_tracker/widgets/participant_icon.dart'; // Assurez-vous que cet import est correct
import 'package:neurexp_tracker/screens/participant_form_screen.dart';
import 'package:neurexp_tracker/screens/preparation_screen.dart'; // Assurez-vous que ce fichier existe
import 'package:neurexp_tracker/utils/constants.dart';
import 'package:neurexp_tracker/screens/participant_detail_screen.dart'; // Assurez-vous que ce fichier existe

class StudyDetailScreen extends StatefulWidget {
  final Study study;

  const StudyDetailScreen({super.key, required this.study});

  @override
  State<StudyDetailScreen> createState() => _StudyDetailScreenState();
}

class _StudyDetailScreenState extends State<StudyDetailScreen> {
  List<Participant> _participants = []; // Liste des participants de cette étude

  @override
  void initState() {
    super.initState();
    _generateFakeParticipants(); // Génère des participants fictifs au chargement de l'écran
  }

  // Génère des participants fictifs pour l'affichage
  void _generateFakeParticipants() {
    final int numParticipantsToGenerate = widget.study.expectedParticipants > 0 ? widget.study.expectedParticipants : 10;
    _participants = List.generate(numParticipantsToGenerate, (index) {
      final participantId = 'P${index + 1}';
      ParticipantStatus status;

      if (index < widget.study.completedParticipants) {
        status = ParticipantStatus.completed;
      } else if (index < widget.study.completedParticipants + (numParticipantsToGenerate ~/ 4)) {
        status = ParticipantStatus.upcoming;
      } else {
        status = ParticipantStatus.recruited;
      }

      DateTime? expDate;
      if (status == ParticipantStatus.upcoming) {
        if (index % 3 == 0) {
          expDate = DateTime.now();
        } else {
          expDate = DateTime.now().add(Duration(days: (index + 1) * 7));
        }
      }

      return Participant(
        id: participantId,
        nip: 'NIP-${index + 1}',
        // <<< CORRECTION ICI : Utiliser les valeurs de l'énumération Gender >>>
        gender: index % 2 == 0 ? Gender.male : Gender.female, // Utilise Gender.male et Gender.female
        age: 20 + index,
        experimentDate: expDate,
        status: status,
      );
    });
  }

  // Ouvre le formulaire pour ajouter un nouveau participant ou éditer un existant
  Future<void> _addOrEditParticipant(Participant? participant) async {
    final result = await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => ParticipantFormScreen(
          study: widget.study,
          initialParticipant: participant, // Passe le participant pour l'édition, ou null pour la création
        ),
      ),
    );

    // Si un participant a été sauvegardé et retourné par le formulaire
    if (result != null && result is Participant) {
      setState(() {
        if (participant == null) { // C'est un nouveau participant
          _participants.add(result);
          // Met à jour le compteur de l'étude si le nouveau participant est complété
          if (result.status == ParticipantStatus.completed) {
            widget.study.completedParticipants++;
          }
        } else { // C'est un participant existant qui a été édité
          final index = _participants.indexWhere((p) => p.id == result.id);
          if (index != -1) {
            // Met à jour le compteur 'completedParticipants' si le statut a changé
            final oldStatus = _participants[index].status;
            final newStatus = result.status;

            if (oldStatus != newStatus) {
              if (newStatus == ParticipantStatus.completed && oldStatus != ParticipantStatus.completed) {
                widget.study.completedParticipants++;
              } else if (oldStatus == ParticipantStatus.completed && newStatus != ParticipantStatus.completed) {
                widget.study.completedParticipants--;
              }
            }
            _participants[index] = result; // Met à jour le participant dans la liste
          }
        }
      });
    }
  }

  // Lancer le processus d'expérience pour un participant (déclenche la préparation)
  // Cette fonction n'est plus appelée directement depuis ParticipantIcon,
  // mais elle est conservée pour référence si vous souhaitez l'utiliser ailleurs.
  void _startExperience(Participant participant) async {
    final DateTime now = DateTime.now();
    final bool isToday = participant.experimentDate != null &&
        participant.experimentDate!.year == now.year &&
        participant.experimentDate!.month == now.month &&
        participant.experimentDate!.day == now.day;

    Participant? updatedParticipant = participant;
    // Si le participant est "recruited" et que l'expérience est aujourd'hui, on le marque comme "upcoming"
    if (participant.status == ParticipantStatus.recruited && isToday) {
      updatedParticipant = Participant(
        id: participant.id,
        nip: participant.nip,
        gender: participant.gender,
        age: participant.age,
        experimentDate: participant.experimentDate ?? now, // Assure une date si elle était nulle
        status: ParticipantStatus.upcoming, // Met à jour le statut
      );
      final index = _participants.indexWhere((p) => p.id == participant.id);
      if (index != -1) {
        setState(() {
          _participants[index] = updatedParticipant!;
        });
      }
    }

    // Navigue vers l'écran de préparation
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => PreparationScreen(
          study: widget.study,
          participant: updatedParticipant!,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.study.name),
        centerTitle: true,
        actions: [
          // Bouton pour ajouter un nouveau participant
          IconButton(
            icon: const Icon(Icons.add),
            tooltip: 'Ajouter un nouveau participant',
            onPressed: () => _addOrEditParticipant(null), // Ouvre le formulaire pour création
          ),
        ],
      ),
      body: Column(
        children: [
          // Section d'informations sur l'étude
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(widget.study.name, style: Theme.of(context).textTheme.headlineSmall),
                const SizedBox(height: 8),
                Text(widget.study.description),
                const SizedBox(height: 16),
                // Barre de progression
                Row(
                  children: [
                    Expanded(
                      child: LinearProgressIndicator(
                        value: widget.study.expectedParticipants == 0 ? 0.0 :
                               widget.study.completedParticipants.toDouble() / widget.study.expectedParticipants.toDouble(),
                        backgroundColor: kPaleBlue,
                        valueColor: const AlwaysStoppedAnimation<Color>(kDarkBlue),
                        minHeight: 10,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text('${widget.study.completedParticipants}/${widget.study.expectedParticipants}', style: kProgressTextStyle),
                  ],
                ),
              ],
            ),
          ),
          const Divider(), // Séparateur visuel

          // Grille des participants
          Expanded(
            child: _participants.isEmpty
                ? const Center(child: Text('Aucun participant pour cette étude.'))
                : GridView.builder(
                    padding: const EdgeInsets.all(16.0),
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 5, // Nombre d'icônes par ligne
                      crossAxisSpacing: 12.0, // Espacement horizontal
                      mainAxisSpacing: 12.0, // Espacement vertical
                      childAspectRatio: 1.0, // Ratio largeur/hauteur (carré)
                    ),
                    itemCount: _participants.length,
                    itemBuilder: (context, index) {
                      final participant = _participants[index];
                      return ParticipantIcon(
                        participant: participant,
                        onTap: () {
                          // Quand on tape sur l'icône, on ouvre l'écran de détail du participant
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (context) => ParticipantDetailScreen( // Assurez-vous que ce fichier existe et est importé
                                participant: participant,
                                study: widget.study,
                              ),
                            ),
                          );
                        },
                        // L'action de démarrage de l'expérience est gérée via le formulaire de modification du participant
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}