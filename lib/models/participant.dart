// lib/models/participant.dart
import 'package:flutter/material.dart'; // Pour Color et Colors

// ... (enum ParticipantStatus et son extension displayName) ...
enum ParticipantStatus {
  recruited,
  upcoming,
  completed,
}


extension ParticipantStatusX on ParticipantStatus {
  String get displayName {
    switch (this) {
      case ParticipantStatus.recruited: return 'Non recruté';
      case ParticipantStatus.upcoming: return 'À venir';
      case ParticipantStatus.completed: return 'Terminé';
      default: return 'Inconnu';
    }
  }
}

// Ajout d'une énumération pour le genre
enum Gender {
  male,
  female,
  other
}

// Extension pour obtenir une représentation textuelle lisible du genre
extension GenderX on Gender {
  String get displayName {
    switch (this) {
      case Gender.male: return 'Homme';
      case Gender.female: return 'Femme';
      case Gender.other: return 'Autre';
      default: return 'Non spécifié';
    }
  }

  // Méthode pour obtenir l'icône correspondante
  IconData get icon {
    switch (this) {
      case Gender.male: return Icons.male;
      case Gender.female: return Icons.female;
      case Gender.other: return Icons.transgender; // Ou une autre icône appropriée
      default: return Icons.person; // Icône par défaut
    }
  }
}
class RunInfo {
  final String runId;
  String notes;
  String participantResponse;
  String participantImpressionEmoji;
  String? imageUrl;
  String? problematicChannels;

  RunInfo({
    required this.runId,
    this.notes = 'RAS',
    this.participantResponse = '',
    this.participantImpressionEmoji = '😐',
    this.imageUrl,
    this.problematicChannels,
  });
}

// --- Classe Participant ---
class Participant {
  final String id;
  String nip;
  Gender gender; // Utiliser l'énumération Gender
  int age;
  DateTime? experimentDate;
  ParticipantStatus status;
  List<RunInfo> runData;

  Participant({
    required this.id,
    required this.nip,
    this.gender = Gender.other, // Valeur par défaut
    this.age = 0,
    this.experimentDate,
    this.status = ParticipantStatus.recruited,
    List<RunInfo>? runData,
  }) : runData = runData ?? [];

  Color getBorderColor() {
    switch (status) {
      case ParticipantStatus.recruited: return Colors.grey;
      case ParticipantStatus.upcoming: return Colors.orange;
      case ParticipantStatus.completed: return Colors.green;
    }
  }

  void addRunInfo(RunInfo runInfo) {
    runData.add(runInfo);
  }

  void addAllRunInfo(List<RunInfo> runInfos) {
    runData.addAll(runInfos);
  }
}
