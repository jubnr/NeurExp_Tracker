// lib/widgets/participant_icon.dart
import 'package:flutter/material.dart';
import 'package:neurexp_tracker/models/participant.dart'; // Assurez-vous que cet import est correct
import 'package:neurexp_tracker/utils/constants.dart';

class ParticipantIcon extends StatelessWidget {
  final Participant participant;
  final VoidCallback onTap; // Tap principal pour l'édition

  const ParticipantIcon({
    super.key,
    required this.participant,
    required this.onTap, // L'action principale (édition)
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap, // Le tap principal ouvre l'édition
      borderRadius: BorderRadius.circular(100.0), // Pour que le ripple suive le cercle
      child: Container(
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: participant.getBorderColor().withOpacity(0.2), // Fond léger basé sur le statut
          border: Border.all(
            color: participant.getBorderColor(), // Bordure principale basée sur le statut
            width: 2.5,
          ),
        ),
        child: Center( // Centre le contenu dans le cercle
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Icône principale (utilisateur)
              Icon(
                Icons.person,
                color: participant.getBorderColor(), // Couleur de l'icône
                size: 24.0,
              ),
              const SizedBox(height: 4),
              // Affichage du numéro du participant (extrait du NIP)
              Text(
                participant.nip.split('-').last, // Ex: "1" de "NIP-1"
                style: TextStyle(
                  color: participant.getBorderColor(), // Couleur du texte
                  fontWeight: FontWeight.bold,
                  fontSize: 12.0,
                ),
              ),
              // Afficher la date si le statut est 'upcoming' et que ce n'est pas aujourd'hui
              if (participant.status == ParticipantStatus.upcoming &&
                  participant.experimentDate != null &&
                  !(participant.experimentDate!.day == DateTime.now().day &&
                    participant.experimentDate!.month == DateTime.now().month &&
                    participant.experimentDate!.year == DateTime.now().year))
                Text(
                  participant.experimentDate!.toLocal().toIso8601String().split('T')[0], // Format AAAA-MM-JJ
                  style: kCardSubtitleTextStyle.copyWith(fontSize: 10.0),
                  overflow: TextOverflow.ellipsis,
                ),
            ],
          ),
        ),
      ),
    );
  }
}